// Live Quiz Host Main Application
window.LiveQuizHost = (function() {
    'use strict';

    function init() {
        // Initialize UI components first
        if (window.LiveQuizHostUI) {
            window.LiveQuizHostUI.init();
        }

        // Initialize all host modules
        if (window.LiveQuizHostSetup) {
            window.LiveQuizHostSetup.init();
        }

        if (window.LiveQuizHostLobby) {
            window.LiveQuizHostLobby.init();
        }

        if (window.LiveQuizHostGame) {
            window.LiveQuizHostGame.init();
        }

        if (window.LiveQuizHostResults) {
            window.LiveQuizHostResults.init();
        }

        // Initialize common functionality
        if (window.LiveQuizCommon) {
            window.LiveQuizCommon.setLanguage(window.LiveQuizCommon.getPreferredLanguage());
            window.LiveQuizCommon.populateCategoryPresets();
            window.LiveQuizCommon.showScreen('setup-screen');
        }

        // Try to recover previous session state
        setTimeout(() => {
            if (window.LiveQuizHost && window.LiveQuizHost.recoverHostState) {
                const recovered = window.LiveQuizHost.recoverHostState();
                if (recovered) {
                    console.log('✅ Host session recovered successfully');
                }
            }
        }, 500);
    }

    return {
        init: init
    };
})();