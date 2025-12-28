document.addEventListener('DOMContentLoaded', () => {
    const style = document.createElement('style');
    style.textContent = `
        .layout-btn.active, .graph-mode-btn.active { background-color: white; color: #1f2937; font-weight: 600; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06); }
        .layout-btn, .graph-mode-btn { background-color: transparent; color: #4b5563; }
    `;
    document.head.appendChild(style);
    // DOM Elements
    const dropArea = document.getElementById('drop-area');
    const fileInput = document.getElementById('file-input');
    const dropAreaContent = document.getElementById('drop-area-content');
    const loadingIndicator = document.getElementById('loading-indicator');
    const contentArea = document.getElementById('content-area');
    const errorMessage = document.getElementById('error-message');
    const errorText = document.getElementById('error-text');
    const searchInput = document.getElementById('search-input');
    const explanationSearch = document.getElementById('explanation-search');
    const answerSearch = document.getElementById('answer-search');
    const sortSelect = document.getElementById('sort-select');
    const itemsPerPageSelect = document.getElementById('items-per-page-select');
    const modelFilter = document.getElementById('model-filter');
    const levelFilter = document.getElementById('level-filter');
    const dateFromFilter = document.getElementById('date-from-filter');
    const dateToFilter = document.getElementById('date-to-filter');
    const exportJsonBtn = document.getElementById('export-json-btn');
    const themeToggle = document.getElementById('theme-toggle');
    const themeToggleDarkIcon = document.getElementById('theme-toggle-dark-icon');
    const themeToggleLightIcon = document.getElementById('theme-toggle-light-icon');
    const questionsContainer = document.getElementById('questions-container');
    const paginationControls = document.getElementById('pagination-controls');
    const networkContainer = document.getElementById('network-graph');
    const headerSubtitle = document.getElementById('header-subtitle');
    const renderGraphBtn = document.getElementById('render-graph-btn');
    const graphControls = document.getElementById('graph-controls');
    const chargeSlider = document.getElementById('charge-slider');
    const chargeValue = document.getElementById('charge-value');
    const linkDistSlider = document.getElementById('link-dist-slider');
    const linkDistValue = document.getElementById('link-dist-value');
    const gravitySlider = document.getElementById('gravity-slider');
    const gravityValue = document.getElementById('gravity-value');
    const layoutControls = document.getElementById('layout-controls');
    const minNodeWeightSlider = document.getElementById('min-node-weight-slider');
    const minNodeWeightValue = document.getElementById('min-node-weight-value');
    const minLinkStrengthSlider = document.getElementById('min-link-strength-slider');
    const minLinkStrengthValue = document.getElementById('min-link-strength-value');
    const graphModeControls = document.getElementById('graph-mode-controls');
    const additionalContentArea = document.getElementById('additional-content-area');
    // App State
    let db = null;
    let charts = {};
    let allQuestions = [];
    let filteredQuestions = [];
    let currentPage = 1;
    let itemsPerPage = parseInt(itemsPerPageSelect.value || '9', 10);
    let wordCloudData = {};
    let networkDataSets = {
        keywords: { nodes: [], links: [], maxNodeWeight: 0, maxLinkStrength: 0 },
        subcategories: { nodes: [], links: [], maxNodeWeight: 0, maxLinkStrength: 0 }
    };
    let currentGraphMode = 'keywords';
    let networkSimulation = null;
    let tablePages = {
        modelStats: 1,
        promptHistory: 1,
        errorLogs: 1,
        blueprints: 1,
        cache: 1
    };
    const TABLE_ITEMS_PER_PAGE = 10;
    const tableState = {
        modelStats: { page: 1, sortBy: 'model_name', sortOrder: 'asc' },
        promptHistory: { page: 1, sortBy: 'id', sortOrder: 'desc' },
        errorLogs: { page: 1, sortBy: 'id', sortOrder: 'desc' },
        blueprints: { page: 1, sortBy: 'id', sortOrder: 'desc' },
        cache: { page: 1, sortBy: 'id', sortOrder: 'desc' }
    };
    function parseDateSafe(dateString) {
        if (!dateString) return 0;
        try {
            let iso = String(dateString);
            if (iso.indexOf(' ') !== -1 && iso.indexOf('T') === -1) iso = iso.replace(' ', 'T');
            const date = new Date(iso);
            return isNaN(date.getTime()) ? 0 : date.getTime();
        } catch (err) { return 0; }
    }
    window.onerror = (message) => showError(`Krytyczny błąd skryptu: ${message}`);
    const sqlJsPromise = initSqlJs({
        locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${file}`
    }).catch(e => showError("Nie można załadować biblioteki SQL. Sprawdź połączenie internetowe."));

    // Theme Toggle Logic
    if (localStorage.getItem('color-theme') === 'dark' || (!('color-theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
        themeToggleLightIcon.classList.remove('hidden');
    } else {
        document.documentElement.classList.remove('dark');
        themeToggleDarkIcon.classList.remove('hidden');
    }

    themeToggle.addEventListener('click', function() {
        themeToggleDarkIcon.classList.toggle('hidden');
        themeToggleLightIcon.classList.toggle('hidden');
        if (localStorage.getItem('color-theme')) {
            if (localStorage.getItem('color-theme') === 'light') {
                document.documentElement.classList.add('dark');
                localStorage.setItem('color-theme', 'dark');
            } else {
                document.documentElement.classList.remove('dark');
                localStorage.setItem('color-theme', 'light');
            }
        } else {
            if (document.documentElement.classList.contains('dark')) {
                document.documentElement.classList.remove('dark');
                localStorage.setItem('color-theme', 'light');
            } else {
                document.documentElement.classList.add('dark');
                localStorage.setItem('color-theme', 'dark');
            }
        }
    });

    dropArea.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));
    const filterElements = [searchInput, explanationSearch, answerSearch, sortSelect, modelFilter, levelFilter, dateFromFilter, dateToFilter, itemsPerPageSelect];
    filterElements.forEach(el => el.addEventListener('input', () => {
        currentPage = 1;
        if (el.id === 'items-per-page-select') itemsPerPage = parseInt(el.value, 10) || 9;
        renderApp();
    }));

    exportJsonBtn.addEventListener('click', () => {
        if (filteredQuestions.length === 0) return;
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(filteredQuestions, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "questions_export.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    });
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(ev => dropArea.addEventListener(ev, e => {e.preventDefault(); e.stopPropagation();}));
    ['dragenter', 'dragover'].forEach(ev => dropArea.addEventListener(ev, () => dropArea.classList.add('drag-area-highlight')));
    ['dragleave', 'drop'].forEach(ev => dropArea.addEventListener(ev, () => dropArea.classList.remove('drag-area-highlight')));
    dropArea.addEventListener('drop', (e) => handleFile(e.dataTransfer.files[0]));
    function showLoading(isLoading) {
        loadingIndicator.classList.toggle('hidden', !isLoading);
        dropAreaContent.classList.toggle('hidden', isLoading);
        if (isLoading) { contentArea.classList.add('hidden'); errorMessage.classList.add('hidden'); }
    }
    function showError(message) {
        errorText.textContent = message;
        errorMessage.classList.remove('hidden');
        showLoading(false);
        dropArea.classList.remove('hidden');
    }
    async function handleFileContent(uInt8Array, sourceName) {
        showLoading(true);
        try {
            const SQL = await sqlJsPromise;
            if (!SQL) { showError("Nie można zainicjować SQL.js."); return; }
            db = new SQL.Database(uInt8Array);
            processDatabase(sourceName);
        } catch (err) {
            showError(`Błąd podczas przetwarzania bazy danych: ${err.message}`);
        } finally {
            showLoading(false);
        }
    }
    function handleFile(file) {
        if (!file || !/\.(db|sqlite|sqlite3)$/i.test(file.name)) {
            showError("Nieprawidłowy format pliku. Proszę upuścić plik .db, .sqlite lub .sqlite3.");
            return;
        }
        const reader = new FileReader();
        reader.onload = e => handleFileContent(new Uint8Array(e.target.result), file.name);
        reader.readAsArrayBuffer(file);
    }
    function processDatabase(sourceName) {
        try {
            if (!db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='generated_questions'")[0]) {
                showError(`Tabela 'generated_questions' nie została znaleziona w bazie danych.`);
                return;
            }
            const stmt = db.prepare("SELECT * FROM generated_questions");
            allQuestions = [];
            while (stmt.step()) allQuestions.push(stmt.getAsObject());
            stmt.free();
            if (allQuestions.length === 0) {
                showError(`Nie znaleziono żadnych pytań w tabeli 'generated_questions'.`);
                return;
            }
            populateFilters(allQuestions);
            contentArea.classList.remove('hidden');
            dropArea.classList.add('hidden');
            headerSubtitle.textContent = `Wyświetlanie danych z: ${sourceName}`;
            prepareStatistics(allQuestions);
            renderApp();
            // --- DODANE WYWOŁANIA NOWYCH FUNKCJI ---
            additionalContentArea.classList.remove('hidden');
            renderModelStats();
            renderPromptHistory();
            renderErrorLogs();
            renderBlueprints();
            renderCache();
        } catch (e) {
            showError(`Błąd podczas odpytywania bazy danych: ${e.message}`);
        }
    }
    async function tryAutoLoadDatabase() {
        try {
            const response = await fetch('data/questions.db');
            if (response.ok) {
                const arrayBuffer = await response.arrayBuffer();
                await handleFileContent(new Uint8Array(arrayBuffer), 'data/questions.db');
            }
        } catch (error) {
            console.log('Default database not found. Waiting for user to drop a file.');
        }
    }
    function populateFilters(questions) {
        const models = [...new Set(questions.map(q => q.model).filter(Boolean))].sort();
        const levels = [...new Set(questions.map(q => q.knowledge_level).filter(Boolean))].sort();
        modelFilter.innerHTML = '<option value="">Wszystkie modele</option>' + models.map(m => `<option value="${escapeHtml(m)}">${escapeHtml(m)}</option>`).join('');
        levelFilter.innerHTML = '<option value="">Wszystkie poziomy</option>' + levels.map(l => `<option value="${escapeHtml(l)}">${escapeHtml(l)}</option>`).join('');
    }
    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str).replace(/[&<>"']/g, m => ({'&':'&','<':'<','>':'>','"':'"',"'":'&#039;'})[m]);
    }
    function renderApp() {
        const searchTerm = (searchInput.value || '').toLowerCase();
        const explanationTerm = (explanationSearch.value || '').toLowerCase();
        const answerTerm = (answerSearch.value || '').toLowerCase();
        const selectedModel = modelFilter.value;
        const selectedLevel = levelFilter.value;
        const dateFrom = dateFromFilter.value ? new Date(dateFromFilter.value).getTime() : 0;
        const dateTo = dateToFilter.value ? new Date(dateToFilter.value).setHours(23, 59, 59, 999) : Infinity;
        filteredQuestions = allQuestions.filter(q => {
            const keys = JSON.parse(q.key_entities_json || '[]')
            const keywordMatch = Array.isArray(keys) && keys.some(key => (key || '').toLowerCase().includes(searchTerm));
            const searchMatch = !searchTerm || (q.question_text || '').toLowerCase().includes(searchTerm) || (q.category || '').toLowerCase().includes(searchTerm) || keywordMatch;
            const explanationMatch = !explanationTerm || (q.explanation || '').toLowerCase().includes(explanationTerm);
            const answerMatch = !answerTerm || (q.answer_text || '').toLowerCase().includes(answerTerm);
            const modelMatch = !selectedModel || q.model === selectedModel;
            const levelMatch = !selectedLevel || q.knowledge_level === selectedLevel;
            const dateMatch = parseDateSafe(q.created_at) >= dateFrom && parseDateSafe(q.created_at) <= dateTo;
            return searchMatch && explanationMatch && answerMatch && modelMatch && levelMatch && dateMatch;
        });
        const [sortKey, sortOrder] = (sortSelect.value || 'created_at_desc').split('_');
        filteredQuestions.sort((a, b) => {
            if (sortKey === 'created_at') {
                const dateA = parseDateSafe(a.created_at);
                const dateB = parseDateSafe(b.created_at);
                return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
            } else {
                const valA = String(a[sortKey] || '').toLowerCase();
                const valB = String(b[sortKey] || '').toLowerCase();
                if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
                if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
                return 0;
            }
        });
        displayPaginatedQuestions();
        renderPagination();
    }
    function displayPaginatedQuestions() {
        questionsContainer.innerHTML = '';
        const paginatedItems = filteredQuestions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
        if (paginatedItems.length === 0) {
            questionsContainer.innerHTML = `<p class="text-gray-500 col-span-full text-center">Brak pytań spełniających kryteria.</p>`;
            return;
        }
        paginatedItems.forEach(q => {
            const card = document.createElement('div');
            card.className = 'bg-white p-6 rounded-xl shadow-md flex flex-col gap-4 cursor-pointer hover:shadow-lg transition-shadow';
            const options = JSON.parse(q.options_json || '[]');
            const keys = JSON.parse(q.key_entities_json || '[]');
            const createdAt = parseDateSafe(q.created_at);
            card.innerHTML = `
                <div>
                    <div class="flex justify-between items-start">
                        <span class="text-sm font-semibold text-indigo-600 bg-indigo-100 px-2 py-1 rounded">${escapeHtml(q.category || 'Brak')}</span>
                        <span class="text-xs text-gray-500">${escapeHtml(q.model || 'Brak')}</span>
                    </div>
                    <h3 class="text-lg font-bold mt-2">${escapeHtml(q.question_text || 'Brak')}</h3>
                </div>
                <div class="question-details space-y-4">
                    <p class="font-semibold text-green-700">Odpowiedź: ${escapeHtml(q.answer_text || 'Brak')}</p>
                    <div class="text-sm text-gray-600"><p class="font-semibold">Wyjaśnienie:</p><p>${escapeHtml(q.explanation || 'Brak')}</p></div>
                    <div class="text-sm"><p class="font-semibold">Opcje:</p>${Array.isArray(options) && options.length > 0 ? `<ul class="list-disc list-inside">${options.map(o => `<li>${escapeHtml(o)}</li>`).join('')}</ul>` : 'Brak'}</div>
                    <div class="text-sm"><p class="font-semibold">Słowa kluczowe:</p><div>${Array.isArray(keys) && keys.length > 0 ? keys.map(k => `<span class="card-tag">${escapeHtml(k)}</span>`).join('') : 'Brak'}</div></div>
                </div>
                <div class="text-xs text-gray-400 mt-auto pt-2 border-t">Subkategoria: ${escapeHtml(q.subcategory || 'Brak')} | Poziom: ${escapeHtml(q.knowledge_level || 'Brak')} | Utworzono: ${createdAt ? new Date(createdAt).toLocaleString('pl-PL') : 'Brak daty'}</div>
            `;
            card.addEventListener('click', () => card.querySelector('.question-details').classList.toggle('details-visible'));
            questionsContainer.appendChild(card);
        });
    }
    function renderPagination() {
        paginationControls.innerHTML = '';
        const pageCount = Math.ceil(filteredQuestions.length / itemsPerPage);
        if (pageCount <= 1) return;
        const createButton = (text, disabled, onClick) => {
            const btn = document.createElement('button');
            btn.textContent = text;
            btn.className = 'px-4 py-2 rounded-md text-sm font-medium bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed';
            btn.disabled = disabled;
            btn.onclick = onClick;
            return btn;
        };
        const pageInfo = document.createElement('span');
        pageInfo.className = 'px-4 py-2 text-sm font-medium text-gray-700';
        pageInfo.textContent = `Strona ${currentPage} z ${pageCount}`;
        paginationControls.append(
            createButton('Poprzednia', currentPage === 1, () => { currentPage--; renderApp(); }),
            pageInfo,
            createButton('Następna', currentPage === pageCount, () => { currentPage++; renderApp(); })
        );
    }
    function prepareStatistics(questions) {
        if (charts.model) charts.model.destroy();
        const countBy = (data, key) => data.reduce((acc, item) => {
            const value = item[key];
            if (value) acc[value] = (acc[value] || 0) + 1;
            return acc;
        }, {});
        document.getElementById('total-questions-stat').textContent = questions.length;
        const categoryCounts = countBy(questions, 'category');
        document.getElementById('unique-categories-stat').textContent = Object.keys(categoryCounts).length;
        const subcategoryCounts = countBy(questions, 'subcategory');
        document.getElementById('unique-subcategories-stat').textContent = Object.keys(subcategoryCounts).length;
        wordCloudData.category = Object.entries(categoryCounts);
        wordCloudData.subcategory = Object.entries(subcategoryCounts);
        const keyEntitiesCounts = questions.reduce((acc, q) => {
            try { JSON.parse(q.key_entities_json || '[]').forEach(key => { if (key) acc[key] = (acc[key] || 0) + 1; }); } catch (e) {}
            return acc;
        }, {});
        wordCloudData.keys = Object.entries(keyEntitiesCounts);
        charts.model = createChart('model-chart', 'polarArea', countBy(questions, 'model'), 'Pytania wg Modelu');
        // Prepare keyword data
        const kwEdgeMap = {};
        questions.forEach(q => {
            const category = (q.category || '').trim();
            if (!category) return;
            try {
                JSON.parse(q.key_entities_json || '[]').forEach(k => {
                    const kw = String(k || '').trim();
                    if (kw) kwEdgeMap[`${category}||${kw}`] = (kwEdgeMap[`${category}||${kw}`] || 0) + 1;
                });
            } catch(e) {}
        });
        networkDataSets.keywords = buildGraphFromEdgeMap(kwEdgeMap, 'keyword');
        // Prepare subcategory data
        const subcatEdgeMap = {};
        questions.forEach(q => {
            const category = (q.category || '').trim();
            const subcategory = (q.subcategory || '').trim();
            if (category && subcategory) {
                subcatEdgeMap[`${category}||${subcategory}`] = (subcatEdgeMap[`${category}||${subcategory}`] || 0) + 1;
            }
        });
        networkDataSets.subcategories = buildGraphFromEdgeMap(subcatEdgeMap, 'subcategory');
        if (networkDataSets.keywords.nodes.length > 0 || networkDataSets.subcategories.nodes.length > 0) {
            renderGraphBtn.classList.remove('hidden');
        }
        setTimeout(drawWordClouds, 100);
    }
    function buildGraphFromEdgeMap(edgeMap, node2Type) {
        const links = Object.entries(edgeMap).map(([k, v]) => ({ source: k.split('||')[1], target: k.split('||')[0], value: v }));
        const nodesMap = {};
        links.forEach(l => {
            if (!nodesMap[l.source]) nodesMap[l.source] = { id: l.source, type: node2Type, weight: 0 };
            if (!nodesMap[l.target]) nodesMap[l.target] = { id: l.target, type: 'category', weight: 0 };
            nodesMap[l.source].weight += l.value;
            nodesMap[l.target].weight += l.value;
        });
        const nodes = Object.values(nodesMap);
        return {
            nodes: nodes,
            links: links,
            maxNodeWeight: d3.max(nodes, d => d.weight) || 0,
            maxLinkStrength: d3.max(links, d => d.value) || 0,
        };
    }
    function drawWordClouds() {
        createWordCloud('category-wordcloud', wordCloudData.category);
        createWordCloud('subcategory-wordcloud', wordCloudData.subcategory);
        createWordCloud('keys-wordcloud', wordCloudData.keys);
    }
    function createWordCloud(elementId, list) {
        const element = document.getElementById(elementId);
        if (!element) return;
        element.innerHTML = '';
        if (!list || list.length === 0) {
            element.innerHTML = '<p class="text-center text-gray-500 h-full flex items-center justify-center">Brak danych.</p>';
            return;
        }
        const observer = new ResizeObserver(entries => {
            if (entries[0].contentRect.width > 0) {
                drawD3Cloud(element, list);
                observer.disconnect();
            }
        });
        observer.observe(element);
    }
    function drawD3Cloud(element, list) {
        const width = element.offsetWidth, height = element.offsetHeight;
        const words = list.map(([text, size]) => ({ text, size }));
        const fontSizeScale = d3.scaleSqrt().domain([0, d3.max(words, d => d.size) || 1]).range([12, 55]);
        d3.layout.cloud().size([width, height]).words(words).padding(4)
            .rotate(() => 0)
            .font("Inter").fontSize(d => fontSizeScale(d.size))
            .on("end", words => {
                const svg = d3.select(element).append("svg").attr("width", width).attr("height", height);
                const g = svg.append("g").attr("transform", `translate(${width / 2},${height / 2})`);
                g.selectAll("text").data(words).enter().append("text")
                    .style("font-size", d => d.size + "px").style("font-family", "Inter")
                    .style("fill", () => `hsl(${Math.random() * 360}, 70%, 50%)`)
                    .attr("text-anchor", "middle").attr("transform", d => `translate(${d.x},${d.y})rotate(${d.rotate})`)
                    .text(d => d.text).style("cursor", "pointer")
                    .on("click", (e, d) => { searchInput.value = d.text; searchInput.dispatchEvent(new Event('input')); });
            }).start();
    }
    function createChart(canvasId, type, data, label) {
        const ctx = document.getElementById(canvasId).getContext('2d');
        const bgColors = ['rgba(54, 162, 235, 0.8)', 'rgba(255, 99, 132, 0.8)', 'rgba(255, 206, 86, 0.8)', 'rgba(75, 192, 192, 0.8)', 'rgba(153, 102, 255, 0.8)', 'rgba(255, 159, 64, 0.8)'];
        return new Chart(ctx, {
            type,
            data: { labels: Object.keys(data), datasets: [{ label, data: Object.values(data), backgroundColor: bgColors, borderWidth: 1 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }
        });
    }
    renderGraphBtn.addEventListener('click', () => {
        const activeDataSet = networkDataSets[currentGraphMode];
        minNodeWeightSlider.max = activeDataSet.maxNodeWeight || 50;
        if (+minNodeWeightSlider.value > activeDataSet.maxNodeWeight) minNodeWeightSlider.value = 0;
        minNodeWeightValue.textContent = minNodeWeightSlider.value;
        minLinkStrengthSlider.max = activeDataSet.maxLinkStrength || 10;
        if (+minLinkStrengthSlider.value > activeDataSet.maxLinkStrength) minLinkStrengthSlider.value = 0;
        minLinkStrengthValue.textContent = minLinkStrengthSlider.value;
        const minNodeWeight = +minNodeWeightSlider.value;
        const minLinkStrength = +minLinkStrengthSlider.value;
        const nodesAfterWeightFilter = new Set(activeDataSet.nodes.filter(n => n.weight >= minNodeWeight).map(n => n.id));
        const filteredLinks = activeDataSet.links.filter(l => l.value >= minLinkStrength && nodesAfterWeightFilter.has(l.source.id || l.source) && nodesAfterWeightFilter.has(l.target.id || l.target));
        const finalNodeIds = new Set();
        filteredLinks.forEach(l => { finalNodeIds.add(l.source.id || l.source); finalNodeIds.add(l.target.id || l.target); });
        const filteredNodes = activeDataSet.nodes.filter(n => finalNodeIds.has(n.id));
        if (filteredNodes.length > 0) {
            networkContainer.classList.remove('hidden');
            graphControls.classList.remove('hidden');
            createNetworkGraph('network-graph', filteredNodes, filteredLinks);
            renderGraphBtn.textContent = 'Zastosuj Filtry i Przerenderuj';
        } else {
            networkContainer.innerHTML = '<p class="text-center text-gray-500 h-full flex items-center justify-center">Brak danych spełniających kryteria.</p>';
            if (networkSimulation) networkSimulation.stop();
            networkContainer.classList.remove('hidden');
            graphControls.classList.remove('hidden');
        }
    });
    graphModeControls.addEventListener('click', (e) => {
        const button = e.target.closest('.graph-mode-btn');
        if (button) {
            const newMode = button.dataset.mode;
            if (newMode !== currentGraphMode) {
                currentGraphMode = newMode;
                document.querySelectorAll('.graph-mode-btn').forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                renderGraphBtn.click();
            }
        }
    });
    chargeSlider.addEventListener('input', () => { if (networkSimulation) { chargeValue.textContent = chargeSlider.value; networkSimulation.force('charge').strength(+chargeSlider.value).alpha(0.3).restart(); }});
    linkDistSlider.addEventListener('input', () => { if (networkSimulation) { linkDistValue.textContent = linkDistSlider.value; networkSimulation.force('link').distance(+linkDistSlider.value).alpha(0.3).restart(); }});
    gravitySlider.addEventListener('input', () => { if (networkSimulation) { gravityValue.textContent = gravitySlider.value; networkSimulation.force('x').strength(+gravitySlider.value); networkSimulation.force('y').strength(+gravitySlider.value).alpha(0.3).restart(); }});
    minNodeWeightSlider.addEventListener('input', () => minNodeWeightValue.textContent = minNodeWeightSlider.value);
    minLinkStrengthSlider.addEventListener('input', () => minLinkStrengthValue.textContent = minLinkStrengthSlider.value);
    layoutControls.addEventListener('click', (e) => {
        const button = e.target.closest('.layout-btn');
        if (button && networkSimulation) {
            document.querySelectorAll('.layout-btn').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            const layout = button.dataset.layout;
            const { width, height } = networkContainer.getBoundingClientRect();
            networkSimulation.force('radial', null).force('x', null).force('y', null);
            if (layout === 'group') networkSimulation.force('x', d3.forceX(d => d.type === 'category' ? width * 0.25 : width * 0.75).strength(0.15));
            else if (layout === 'radial') networkSimulation.force('radial', d3.forceRadial(Math.min(width, height) / 2.5, width / 2, height / 2).strength(0.6));
            else {
                networkSimulation.force('x', d3.forceX(width / 2).strength(+gravitySlider.value));
                networkSimulation.force('y', d3.forceY(height / 2).strength(+gravitySlider.value));
            }
            networkSimulation.alpha(1).restart();
        }
    });
    function createNetworkGraph(containerId, nodes, links) {
        container = document.getElementById(containerId);
        container.innerHTML = '';
        if (networkSimulation) networkSimulation.stop();
        const width = container.offsetWidth, height = container.offsetHeight;
        const svg = d3.select(container).append('svg').attr('width', width).attr('height', height).attr('viewBox', [0, 0, width, height]);
        const zoomGroup = svg.append('g');
        svg.call(d3.zoom().scaleExtent([0.1, 4]).on('zoom', e => zoomGroup.attr('transform', e.transform)));
        const isKeywordMode = currentGraphMode === 'keywords';
        const color = d => d.type === 'category' ? '#2563eb' : (isKeywordMode ? '#f97316' : '#10b981'); // Blue, Orange, Green
        const linkWidthScale = d3.scaleSqrt().domain([0, d3.max(links, d => d.value) || 1]).range([1, 6]);
        const nodeRadiusScale = d3.scaleSqrt().domain([0, d3.max(nodes, d => d.weight) || 1]).range([6, 20]);
        const link = zoomGroup.append('g').attr('stroke', '#999').attr('stroke-opacity', 0.6).selectAll('line').data(links).join('line').attr('stroke-width', d => linkWidthScale(d.value));
        const node = zoomGroup.append('g').selectAll('g').data(nodes).join('g').call(d3.drag().on('start', dragstarted).on('drag', dragged).on('end', dragended));
        node.append('circle').attr('r', d => nodeRadiusScale(d.weight)).attr('fill', color).attr('stroke', '#fff').attr('stroke-width', 1.5).style('cursor', 'pointer')
            .on('click', (e, d) => { searchInput.value = d.id; searchInput.dispatchEvent(new Event('input')); }).append('title').text(d => `${d.id} (${d.type}, waga: ${d.weight})`);
        node.append('text').attr('x', d => nodeRadiusScale(d.weight) + 6).attr('y', 4).style('font-size', '12px').style('font-family', 'Inter').text(d => d.id);
        networkSimulation = d3.forceSimulation(nodes)
            .force('link', d3.forceLink(links).id(d => d.id).distance(+linkDistSlider.value).strength(0.6))
            .force('charge', d3.forceManyBody().strength(+chargeSlider.value))
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('x', d3.forceX(width / 2).strength(+gravitySlider.value))
            .force('y', d3.forceY(height / 2).strength(+gravitySlider.value))
            .force('collide', d3.forceCollide().radius(d => nodeRadiusScale(d.weight) + 8))
            .on('tick', () => {
                link.attr('x1', d => d.source.x).attr('y1', d => d.source.y).attr('x2', d => d.target.x).attr('y2', d => d.target.y);
                node.attr('transform', d => `translate(${d.x},${d.y})`);
            });
        new ResizeObserver(entries => {
            const { width, height } = entries[0].contentRect;
            svg.attr('viewBox', [0, 0, width, height]);
            networkSimulation.force('center', d3.forceCenter(width / 2, height / 2));
            networkSimulation.force('x').x(width / 2);
            networkSimulation.force('y').y(height / 2);
        }).observe(container);
        function dragstarted(event, d) { if (!event.active) networkSimulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; }
        function dragged(event, d) { d.fx = event.x; d.fy = event.y; }
        function dragended(event, d) { if (!event.active) networkSimulation.alphaTarget(0); d.fx = null; d.fy = null; }
        const legend = svg.append('g').attr('transform', `translate(10,10)`);
        legend.selectAll('*').remove();
        legend.append('circle').attr('r', 6).attr('fill', '#2563eb');
        legend.append('text').attr('x', 14).attr('y', 4).style('font-size', '12px').text('Kategoria');
        legend.append('circle').attr('r', 6).attr('fill', color({type: isKeywordMode ? 'keyword' : 'subcategory'})).attr('transform', 'translate(0,20)');
        legend.append('text').attr('x', 14).attr('y', 24).style('font-size', '12px').text(isKeywordMode ? 'Słowo kluczowe' : 'Subkategoria');
    }

    function sortData(data, sortBy, sortOrder) {
        return [...data].sort((a, b) => {
            let valA = a[sortBy];
            let valB = b[sortBy];
            
            // Handle date fields
            if (sortBy.includes('timestamp') || sortBy.includes('created_at')) {
                valA = new Date(valA).getTime();
                valB = new Date(valB).getTime();
            }
            
            // Handle numeric fields
            if (!isNaN(valA) && !isNaN(valB)) {
                valA = Number(valA);
                valB = Number(valB);
            }
            
            // String comparison
            if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });
    }
    
    function paginateData(data, page, itemsPerPage) {
        const startIndex = (page - 1) * itemsPerPage;
        return data.slice(startIndex, startIndex + itemsPerPage);
    }
    
    function renderPaginationControls(containerId, tableName, totalItems, currentPage) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';
        
        const pageCount = Math.ceil(totalItems / TABLE_ITEMS_PER_PAGE);
        if (pageCount <= 1) return;
        
        const createButton = (text, disabled, onClick) => {
            const btn = document.createElement('button');
            btn.textContent = text;
            btn.className = 'px-4 py-2 rounded-md text-sm font-medium bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed';
            btn.disabled = disabled;
            btn.onclick = onClick;
            return btn;
        };
        
        const pageInfo = document.createElement('span');
        pageInfo.className = 'px-4 py-2 text-sm font-medium text-gray-700';
        pageInfo.textContent = `Strona ${currentPage} z ${pageCount}`;
        
        container.append(
            createButton('Poprzednia', currentPage === 1, () => {
                tableState[tableName].page--;
                renderTableFunctions[tableName]();
            }),
            pageInfo,
            createButton('Następna', currentPage === pageCount, () => {
                tableState[tableName].page++;
                renderTableFunctions[tableName]();
            })
        );
    }
    
    function createSortHeader(columnName, displayName, tableName) {
        const header = document.createElement('th');
        header.className = 'cursor-pointer hover:bg-gray-100';
        
        const headerContent = document.createElement('span');
        headerContent.textContent = displayName;
        header.appendChild(headerContent);
        
        header.onclick = () => {
            const currentState = tableState[tableName];
            if (currentState.sortBy === columnName) {
                currentState.sortOrder = currentState.sortOrder === 'asc' ? 'desc' : 'asc';
            } else {
                currentState.sortBy = columnName;
                currentState.sortOrder = 'asc';
            }
            currentState.page = 1; // Reset to first page when sorting changes
            renderTableFunctions[tableName]();
        };
        
        // Add sort indicator
        if (tableState[tableName].sortBy === columnName) {
            const indicator = document.createElement('span');
            indicator.textContent = tableState[tableName].sortOrder === 'asc' ? ' ↑' : ' ↓';
            header.appendChild(indicator);
        }
        
        return header.outerHTML;
    }
    
    const renderTableFunctions = {
        modelStats: renderModelStats,
        promptHistory: renderPromptHistory,
        errorLogs: renderErrorLogs,
        blueprints: renderBlueprints,
        cache: renderCache
    };
    
    function queryDatabase(tableName, columns = "*", orderBy = "") {
        try {
            if (!db.exec(`SELECT name FROM sqlite_master WHERE type='table' AND name='${tableName}'`)[0]) {
                console.warn(`Tabela '${tableName}' nie została znaleziona.`);
                return [];
            }
            const stmt = db.prepare(`SELECT ${columns} FROM ${tableName} ${orderBy ? `ORDER BY ${orderBy}`: ''}`);
            const results = [];
            while (stmt.step()) {
                results.push(stmt.getAsObject());
            }
            stmt.free();
            return results;
        } catch (e) {
            showError(`Błąd podczas odpytywania tabeli ${tableName}: ${e.message}`);
            return [];
        }
    }
    function renderModelStats() {
        const data = queryDatabase('model_stats', '*', '');
        const container = document.getElementById('model-stats-table-container');
        const canvas = document.getElementById('model-stats-chart');
        if (data.length === 0) {
            container.innerHTML = `<p class="text-gray-500 text-center">Brak danych o statystykach modeli.</p>`;
            canvas.style.display = 'none';
            return;
        }
        canvas.style.display = 'block';

        // Apply sorting
        const sortedData = sortData(data, tableState.modelStats.sortBy, tableState.modelStats.sortOrder);
        
        // Apply pagination
        const paginatedData = paginateData(sortedData, tableState.modelStats.page, TABLE_ITEMS_PER_PAGE);

        let tableHtml = `<table class="data-table"><thead><tr>
            ${createSortHeader('model_name', 'Model', 'modelStats')}
            ${createSortHeader('generated_questions', 'Wygenerowane Pytania', 'modelStats')}
            ${createSortHeader('errors', 'Błędy', 'modelStats')}
            ${createSortHeader('total_response_time', 'Całkowity Czas Odp. (s)', 'modelStats')}
            <th>Średni Czas Odp. (s)</th>
        </tr></thead><tbody>`;
        paginatedData.forEach(row => {
            const avgTime = row.generated_questions > 0 ? (row.total_response_time / row.generated_questions).toFixed(3) : '0.000';
            tableHtml += `<tr>
                <td>${escapeHtml(row.model_name)}</td>
                <td>${row.generated_questions}</td>
                <td>${row.errors}</td>
                <td>${row.total_response_time.toFixed(3)}</td>
                <td>${avgTime}</td>
            </tr>`;
        });
        tableHtml += `</tbody></table>`;
        container.innerHTML = tableHtml;

        // Render pagination controls
        renderPaginationControls('model-stats-pagination', 'modelStats', data.length, tableState.modelStats.page);

        if (charts.modelStats) charts.modelStats.destroy();
        charts.modelStats = new Chart(canvas.getContext('2d'), {
            type: 'bar',
            data: {
                labels: sortedData.map(r => r.model_name),
                datasets: [
                    { label: 'Wygenerowane Pytania', data: sortedData.map(r => r.generated_questions), backgroundColor: 'rgba(59, 130, 246, 0.7)', yAxisID: 'y' },
                    { label: 'Błędy', data: sortedData.map(r => r.errors), backgroundColor: 'rgba(239, 68, 68, 0.7)', yAxisID: 'y' },
                    { label: 'Śr. Czas Odp. (s)', data: sortedData.map(r => r.generated_questions > 0 ? (r.total_response_time / r.generated_questions) : 0), type: 'line', borderColor: 'rgba(16, 185, 129, 1)', backgroundColor: 'rgba(16, 185, 129, 0.2)', yAxisID: 'y1', tension: 0.3 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { type: 'linear', display: true, position: 'left', beginAtZero: true, title: { display: true, text: 'Ilość' } },
                    y1: { type: 'linear', display: true, position: 'right', beginAtZero: true, grid: { drawOnChartArea: false }, title: { display: true, text: 'Czas (s)' } }
                },
                plugins: { legend: { position: 'top' } }
            }
        });
    }
    function renderPromptHistory() {
        const data = queryDatabase('prompt_history', 'id, timestamp, model, prompt, raw_response', '');
        const container = document.getElementById('prompt-history-table-container');
        if (data.length === 0) {
            container.innerHTML = `<p class="text-gray-500 text-center">Brak danych w historii promptów.</p>`;
            return;
        }
        
        // Apply sorting
        const sortedData = sortData(data, tableState.promptHistory.sortBy, tableState.promptHistory.sortOrder);
        
        // Apply pagination
        const paginatedData = paginateData(sortedData, tableState.promptHistory.page, TABLE_ITEMS_PER_PAGE);

        let tableHtml = `<table class="data-table"><thead><tr>
            ${createSortHeader('id', 'ID', 'promptHistory')}
            ${createSortHeader('timestamp', 'Czas', 'promptHistory')}
            ${createSortHeader('model', 'Model', 'promptHistory')}
            <th>Prompt</th>
            <th>Odpowiedź</th>
        </tr></thead><tbody>`;
        paginatedData.forEach(row => {
            tableHtml += `<tr>
                <td>${row.id}</td>
                <td>${new Date(row.timestamp).toLocaleString('pl-PL')}</td>
                <td>${escapeHtml(row.model)}</td>
                <td><pre>${escapeHtml(row.prompt)}</pre></td>
                <td><pre>${escapeHtml(row.raw_response)}</pre></td>
            </tr>`;
        });
        tableHtml += `</tbody></table>`;
        container.innerHTML = tableHtml;

        // Render pagination controls
        renderPaginationControls('prompt-history-pagination', 'promptHistory', data.length, tableState.promptHistory.page);
    }
    function renderErrorLogs() {
        const data = queryDatabase('error_logs', 'id, timestamp, endpoint, error_details_json', '');
        const container = document.getElementById('error-logs-table-container');
        if (data.length === 0) {
            container.innerHTML = `<p class="text-gray-500 text-center">Brak logów błędów.</p>`;
            return;
        }
        
        // Apply sorting
        const sortedData = sortData(data, tableState.errorLogs.sortBy, tableState.errorLogs.sortOrder);
        
        // Apply pagination
        const paginatedData = paginateData(sortedData, tableState.errorLogs.page, TABLE_ITEMS_PER_PAGE);

        let tableHtml = `<table class="data-table"><thead><tr>
            ${createSortHeader('id', 'ID', 'errorLogs')}
            ${createSortHeader('timestamp', 'Czas', 'errorLogs')}
            ${createSortHeader('endpoint', 'Endpoint', 'errorLogs')}
            <th>Szczegóły</th>
        </tr></thead><tbody>`;
        paginatedData.forEach(row => {
            let details = row.error_details_json;
            try { details = JSON.stringify(JSON.parse(details), null, 2); } catch(e) {}
            tableHtml += `<tr>
                <td>${row.id}</td>
                <td>${new Date(row.timestamp).toLocaleString('pl-PL')}</td>
                <td>${escapeHtml(row.endpoint)}</td>
                <td><pre>${escapeHtml(details)}</pre></td>
            </tr>`;
        });
        tableHtml += `</tbody></table>`;
        container.innerHTML = tableHtml;

        // Render pagination controls
        renderPaginationControls('error-logs-pagination', 'errorLogs', data.length, tableState.errorLogs.page);
    }

    function renderBlueprints() {
        const data = queryDatabase('question_blueprints', '*', '');
        const container = document.getElementById('blueprints-table-container');
        if (data.length === 0) {
            container.innerHTML = `<p class="text-gray-500 text-center">Brak danych o blueprintach.</p>`;
            return;
        }
        
        // Apply sorting
        const sortedData = sortData(data, tableState.blueprints.sortBy, tableState.blueprints.sortOrder);
        
        // Apply pagination
        const paginatedData = paginateData(sortedData, tableState.blueprints.page, TABLE_ITEMS_PER_PAGE);

        let tableHtml = `<table class="data-table"><thead><tr>
            ${createSortHeader('id', 'ID', 'blueprints')}
            ${createSortHeader('category', 'Kategoria', 'blueprints')}
            ${createSortHeader('subcategory', 'Subkategoria', 'blueprints')}
            ${createSortHeader('modifier', 'Modyfikator', 'blueprints')}
            ${createSortHeader('target_answer', 'Docelowa Odp.', 'blueprints')}
            ${createSortHeader('is_used', 'Użyty', 'blueprints')}
            ${createSortHeader('created_at', 'Utworzono', 'blueprints')}
        </tr></thead><tbody>`;
        paginatedData.forEach(row => {
            tableHtml += `<tr>
                <td>${row.id}</td>
                <td>${escapeHtml(row.category)}</td>
                <td>${escapeHtml(row.subcategory)}</td>
                <td>${escapeHtml(row.modifier)}</td>
                <td>${escapeHtml(row.target_answer)}</td>
                <td><span class="${row.is_used ? 'text-red-600 font-bold' : 'text-green-600 font-bold'}">${row.is_used ? 'TAK' : 'NIE'}</span></td>
                <td>${new Date(row.created_at).toLocaleString('pl-PL')}</td>
            </tr>`;
        });
        tableHtml += `</tbody></table>`;
        container.innerHTML = tableHtml;

        // Render pagination controls
        renderPaginationControls('blueprints-pagination', 'blueprints', data.length, tableState.blueprints.page);
    }

    function renderCache() {
        const data = queryDatabase('preloaded_questions_cache', '*', '');
        const container = document.getElementById('cache-table-container');
        if (data.length === 0) {
            container.innerHTML = `<p class="text-gray-500 text-center">Brak pytań w kolejce preload.</p>`;
            return;
        }
        
        // Apply sorting
        const sortedData = sortData(data, tableState.cache.sortBy, tableState.cache.sortOrder);
        
        // Apply pagination
        const paginatedData = paginateData(sortedData, tableState.cache.page, TABLE_ITEMS_PER_PAGE);

        let tableHtml = `<table class="data-table"><thead><tr>
            ${createSortHeader('id', 'ID', 'cache')}
            ${createSortHeader('category', 'Kategoria', 'cache')}
            <th>Dane (JSON)</th>
            ${createSortHeader('created_at', 'Utworzono', 'cache')}
        </tr></thead><tbody>`;
        paginatedData.forEach(row => {
            let details = row.question_data_json;
            try { details = JSON.stringify(JSON.parse(details), null, 2); } catch(e) {}
            tableHtml += `<tr>
                <td>${row.id}</td>
                <td>${escapeHtml(row.category)}</td>
                <td><pre>${escapeHtml(details)}</pre></td>
                <td>${new Date(row.created_at).toLocaleString('pl-PL')}</td>
            </tr>`;
        });
        tableHtml += `</tbody></table>`;
        container.innerHTML = tableHtml;

        // Render pagination controls
        renderPaginationControls('cache-pagination', 'cache', data.length, tableState.cache.page);
    }

    tryAutoLoadDatabase();
});
