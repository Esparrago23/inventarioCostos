with open('frontend/app.js', 'a') as f:
    f.write('''

window.showView = function(viewId) {
    document.querySelectorAll('.view-section').forEach(el => el.style.display = 'none');
    document.getElementById(viewId).style.display = 'block';
    
    document.querySelectorAll('.sidebar-nav a').forEach(el => el.classList.remove('active'));
    
    const activeMapping = {
        'view-inventario': 'nav-inventario',
        'view-proyectos': 'nav-proyectos',
        'view-proyecto-detail': 'nav-proyectos',
        'view-catalogo-servicios': 'nav-servicios',
        'view-catalogo-materiales': 'nav-materiales'
    };
    
    const navId = activeMapping[viewId];
    if (navId) {
        document.getElementById(navId).classList.add('active');
    }
};

window.openProject = function(projectName) {
    document.getElementById('current-project-title').textContent = 'Registro de Materiales - ' + projectName;
    window.showView('view-proyecto-detail');
};

// Start by showing the default view
document.addEventListener('DOMContentLoaded', () => {
    window.showView('view-proyectos');
});
''')
