with open('frontend/style.css', 'a') as f:
    f.write('''
/* --- NEW LAYOUT STYLES --- */
body {
    margin: 0;
    padding: 0;
}
.app-layout {
    display: flex;
    height: 100vh;
}
.sidebar {
    width: 250px;
    background-color: #2c3e50;
    color: #ecf0f1;
    display: flex;
    flex-direction: column;
}
.sidebar-header {
    padding: 20px;
    background-color: #1a252f;
    text-align: center;
}
.sidebar-header h2 {
    margin: 0;
    font-size: 20px;
}
.sidebar-nav {
    display: flex;
    flex-direction: column;
    padding-top: 20px;
}
.sidebar-nav a {
    color: #bdc3c7;
    text-decoration: none;
    padding: 15px 20px;
    font-size: 15px;
    border-left: 4px solid transparent;
    transition: background-color 0.2s, color 0.2s, border-left 0.2s;
}
.sidebar-nav a:hover {
    background-color: #34495e;
    color: #fff;
}
.sidebar-nav a.active {
    background-color: #34495e;
    color: #fff;
    border-left: 4px solid #3498db;
}

.main-content {
    flex: 1;
    overflow-y: auto;
    background-color: #f4f7f6;
}
.view-section {
    padding-bottom: 40px;
}
.placeholder-content {
    background: #fff;
    padding: 30px;
    border-radius: 8px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    margin-top: 20px;
}
.projects-grid {
    display: flex;
    gap: 20px;
    margin-top: 20px;
}
.project-card {
    background: #ecf0f1;
    padding: 20px;
    border-radius: 8px;
    cursor: pointer;
    border: 1px solid #bdc3c7;
    flex: 1;
    text-align: center;
    transition: transform 0.2s;
}
.project-card:hover {
    transform: translateY(-5px);
    background: #fff;
    box-shadow: 0 4px 10px rgba(0,0,0,0.1);
}
.project-card h4 {
    margin-bottom: 5px;
    color: #2c3e50;
    font-size: 18px;
}
.project-card p {
    color: #7f8c8d;
    font-size: 13px;
}
''')
