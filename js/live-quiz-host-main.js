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
            window.LiveQuizCommon.populateCategoryPresets();
            window.LiveQuizCommon.showScreen('setup-screen');
        }
    }

    return {
        init: init
    };
})();