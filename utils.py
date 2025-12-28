import re
import random
import json
from typing import Any, Dict, List, Optional
from collections import deque
from fastapi import HTTPException

from config import ALLOWED_MODELS, PROMPTS, DEBUG_MODE
from state import CATEGORY_GENERATION_HISTORY, MAX_SUBCATEGORY_HISTORY, MAX_ENTITY_HISTORY, MAX_CATEGORIES_TRACKED

def update_generation_history(category: str, subcategory: str, key_entities: List[str]):
    if category not in CATEGORY_GENERATION_HISTORY:
        if len(CATEGORY_GENERATION_HISTORY) >= MAX_CATEGORIES_TRACKED:
            oldest = next(iter(CATEGORY_GENERATION_HISTORY))
            del CATEGORY_GENERATION_HISTORY[oldest]
            print(f"Removed oldest category '{oldest}' to enforce limit of {MAX_CATEGORIES_TRACKED}.")

        CATEGORY_GENERATION_HISTORY[category] = {
            "subcategories": deque(maxlen=MAX_SUBCATEGORY_HISTORY),
            "entities": deque(maxlen=MAX_ENTITY_HISTORY)
        }
    if subcategory:
        CATEGORY_GENERATION_HISTORY[category]["subcategories"].append(subcategory)
    if key_entities:
        for entity in key_entities:
            CATEGORY_GENERATION_HISTORY[category]["entities"].append(entity)
    
    # Log the history update for debugging
    if DEBUG_MODE and (subcategory or key_entities):
        print(f"✅ HISTORY UPDATED for category '{category}':")
        if subcategory:
            print(f"   ➕ Added subcategory: '{subcategory}'")
        if key_entities:
            print(f"   ➕ Added key entities: {key_entities}")
        print(f"   📊 Current history size: {len(CATEGORY_GENERATION_HISTORY[category]['subcategories'])} subcategories, {len(CATEGORY_GENERATION_HISTORY[category]['entities'])} entities")
        print("-" * 80)

def is_question_valid(data: Any, game_mode: str) -> (bool, str):
    if not data or not isinstance(data, dict):
        return False, "Response is not a valid, non-empty dictionary."
    question = data.get("question")
    if not question or not isinstance(question, str) or not question.strip():
        return False, "Response is missing a valid 'question' string."
    if not (10 < len(question) < 500):
        return False, f"Question length ({len(question)}) is outside the optimal range (10-500 chars)."
    if not data.get("explanation_correct"):
        return False, "Response is missing one or more required explanation fields."
    if game_mode == "mcq":
        options = data.get("options")
        answer = data.get("answer")
        if not options or not isinstance(options, list) or len(options) != 4:
            return False, f"MCQ mode: Expected 4 options in a list, but found {len(options) if isinstance(options, list) else 'none'}."
        if any(not isinstance(opt, str) or not opt.strip() for opt in options):
            return False, "MCQ mode: One or more options are invalid (not a string or empty)."
        if len(set(options)) != len(options):
            return False, "MCQ mode: Duplicate options found."
        if not answer or not isinstance(answer, str) or not answer.strip():
            return False, "MCQ mode: Missing or invalid 'answer' string."
        if answer not in options:
            return False, "MCQ mode: The provided 'answer' is not in the 'options' list."
    return True, "Validation successful."

def validate_model(model: str):
    # Allow any model when using dynamic models from API
    from config import DYNAMIC_MODELS
    if DYNAMIC_MODELS and model in DYNAMIC_MODELS:
        return
    # Otherwise check against allowed models
    if model not in ALLOWED_MODELS:
        raise HTTPException(status_code=400, detail=f"Model '{model}' is not supported.")

def build_question_prompt(params: Dict[str, Any], category: str, blueprint: Optional[Dict[str, str]] = None) -> str:
    """
    Build prompt for question generation.
    If blueprint is provided, uses generate_question_from_blueprint prompt.
    Otherwise uses default generate_question prompt.
    """
    lang = params.get("language", "pl") # Default to PL if missing
    
    if blueprint:
        # Use blueprint-specific prompt
        prompt_struct = PROMPTS["generate_question_from_blueprint"][lang]
    else:
        prompt_struct = PROMPTS["generate_question"][lang]
    
    # Validate that the prompt structure has required fields
    required_fields = ["persona", "static_instructions", "task_template"]
    for field in required_fields:
        if field not in prompt_struct:
            raise ValueError(f"Missing required field '{field}' in prompt structure for language '{lang}'")

    history = CATEGORY_GENERATION_HISTORY.get(category, {})
    
    subcategory_history = list(history.get("subcategories", []))
    entity_history = list(history.get("entities", []))

    subcategory_history_prompt = ', '.join(f'"{item}"' for item in subcategory_history) if subcategory_history else "Brak historii / No history."
    entity_history_prompt = ', '.join(f'"{item}"' for item in entity_history) if entity_history else "Brak historii / No history."

    knowledge_key = params.get("knowledgeLevel", "basic")
    game_mode_key = params.get("gameMode", "mcq")
    
    knowledge_prompt = PROMPTS["knowledge_prompts"][knowledge_key][lang]
    game_mode_prompt = PROMPTS["game_mode_prompts"][game_mode_key][lang]
    
    theme_context = params.get("theme", "General knowledge")
    if params.get("includeCategoryTheme") and theme_context:
         theme_text = f"Temat: {theme_context}" if lang == 'pl' else f"Theme: {theme_context}"
    else:
         theme_text = "Brak dodatkowego motywu" if lang == 'pl' else "No additional theme"

    print(f"🔍 LIVE-QUIZ DEBUG: Generating question for category '{category}'")
    if blueprint:
        print(f"🔧 Using blueprint: {blueprint.get('subcategory')} -> {blueprint.get('target_answer')}")
    print("-" * 80)
    
    static_part = [
        prompt_struct["persona"],
        "\n".join(prompt_struct["static_instructions"])
    ]
    static_content = "\n\n".join(static_part)

    if blueprint:
        # Format blueprint-specific template
        dynamic_content = prompt_struct["task_template"].format(
            category=category,
            subcategory=blueprint.get("subcategory", ""),
            modifier=blueprint.get("modifier", ""),
            target_answer=blueprint.get("target_answer", ""),
            knowledge_prompt=knowledge_prompt,
            game_mode_prompt=game_mode_prompt,
            theme_context=theme_text,
            subcategory_history_prompt=subcategory_history_prompt,
            entity_history_prompt=entity_history_prompt
        )
    else:
        # Default template (legacy)
        dynamic_content = prompt_struct["task_template"].format(
            category=category,
            subcategory_suggestion="",
            knowledge_prompt=knowledge_prompt,
            game_mode_prompt=game_mode_prompt,
            theme_context=theme_text,
            subcategory_history_prompt=subcategory_history_prompt,
            entity_history_prompt=entity_history_prompt
        )

    full_prompt = f"{static_content}\n\n{dynamic_content}"

    return full_prompt

def extract_json_from_response(text: str) -> Any:
    if not text or not isinstance(text, str):
        return {"error": "Input text is empty or invalid."}

    cleaned_text = text.strip()
    cleaned_text = re.sub(r'```(?:json)?', '', cleaned_text)
    cleaned_text = cleaned_text.lstrip('`').rstrip('`')

    try:
        return json.loads(cleaned_text)
    except (json.JSONDecodeError, ValueError):
        pass

    json_match_md = re.search(r'{[\s\S]*?}', cleaned_text, re.DOTALL)
    if json_match_md:
        json_str = json_match_md.group().strip()
        try:
            return json.loads(json_str)
        except (json.JSONDecodeError, ValueError):
            pass

    first_brace_index = cleaned_text.find('{')
    if first_brace_index != -1:
        candidate = cleaned_text[first_brace_index:]
        brace_count = 0
        for i, char in enumerate(candidate):
            if char == '{':
                brace_count += 1
            elif char == '}':
                brace_count -= 1
            if brace_count == 0:
                json_str = candidate[:i+1].strip()
                try:
                    return json.loads(json_str)
                except (json.JSONDecodeError, ValueError):
                    break

    error_msg = f"ERROR: JSON parsing failed after all attempts. Raw snippet: {text[:200]}..."
    print(error_msg)
    import database
    try:
        # database.log_error_db is now async, but this is a sync function.
        # We'll skip logging here or use a background task if needed.
        # For now, just print.
        print(f"JSON parsing failed: {text[:200]}")
    except:
        pass  # Don't fail if database logging fails
    return {"error": "Unable to parse JSON from response. Check model output format."}

def format_explanation_part(part: Any) -> str:
    if isinstance(part, str): return part
    if isinstance(part, list): return "\n".join(str(item) for item in part if item)
    if isinstance(part, dict): return "\n".join(f"- {key}: {value}" for key, value in part.items())
    return ""

def build_categories_prompt(language: str, theme: str) -> str:
    """Build a prompt for generating categories, similar to build_question_prompt but for categories."""
    prompt_struct = PROMPTS["generate_categories"][language]
    
    # Combine static instructions and task template
    static_instructions = "\n".join(prompt_struct["static_instructions"])
    task_template = prompt_struct["task_template"].format(theme=theme)
    
    full_prompt = f"{static_instructions}\n\n{task_template}"
    
    return full_prompt