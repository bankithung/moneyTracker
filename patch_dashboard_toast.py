import os

path = r'C:\Users\Asus\Documents\KikonsWealthPlanner\core\templates\core\dashboard.html'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

toast_block = '''
    {% if messages %}
    <div class="toast-container">
        {% for message in messages %}
        <div class="toast {% if message.tags %}toast-{{ message.tags }}{% endif %}">
            <div class="toast-content">{{ message }}</div>
            <button class="toast-close" onclick="this.parentElement.remove()" style="background:none; border:none; font-size:1.2rem;">&times;</button>
        </div>
        {% endfor %}
    </div>
    <script>
        setTimeout(function() {
            const toasts = document.querySelectorAll('.toast');
            toasts.forEach(t => {
                t.style.opacity = '0';
                t.style.transform = 'translateX(100%)';
                setTimeout(() => t.remove(), 300);
            });
        }, 4000);
    </script>
    {% endif %}
'''

if 'toast-container' not in content:
    if '<body>' in content:
        content = content.replace('<body>', '<body>' + toast_block)
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print("Injected toast block into dashboard.html")
    else:
        print("Could not find <body> tag")
else:
    print("Toast block already present")
