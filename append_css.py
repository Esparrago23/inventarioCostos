with open('frontend/style.css', 'a') as f:
    f.write('''
/* NEW STYLES */
.upload-container { display: flex; gap: 20px; margin-bottom: 20px; flex-wrap: wrap; }
.upload-section { flex: 1; background: #fff; padding: 15px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
.upload-form { display: flex; align-items: center; gap: 10px; margin-top: 10px; }
.status-msg { margin-top: 10px; font-weight: bold; color: #27ae60; }
.modal { display: none; position: fixed; z-index: 10; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5); }
.modal-content { background-color: #fefefe; margin: 5% auto; padding: 20px; border: 1px solid #888; width: 60%; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.2); }
.close-btn { color: #aaa; float: right; font-size: 28px; font-weight: bold; cursor: pointer; }
.close-btn:hover, .close-btn:focus { color: black; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 20px; }
.form-group { display: flex; flex-direction: column; }
.form-group label { font-weight: 500; margin-bottom: 5px; }
.form-group input { padding: 8px; border: 1px solid #ccc; border-radius: 4px; }
''')
