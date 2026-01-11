// js/auth.js - Login + Register unificado
document.addEventListener('DOMContentLoaded', () => {
    console.log('🔄 Auth script cargado');

    /* =========================
       ELEMENTOS COMUNES
    ========================= */
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    const errorMessage = document.getElementById('error-message') || document.getElementById('auth-message');
    const successMessage = document.getElementById('success-message') || document.getElementById('auth-message');

    // Params URL (registro / logout)
    const urlParams = new URLSearchParams(window.location.search);

    if (urlParams.has('registered')) {
        showSuccess('¡Registro exitoso! Ahora puedes iniciar sesión.');
    }

    if (urlParams.has('logout')) {
        showSuccess('Sesión cerrada correctamente.');
    }

    /* =========================
       FUNCIÓN setLoading - CORREGIDA
    ========================= */
    function setLoading(button, loading) {
        if (!button) return;

        if (loading) {
            button.dataset.originalText = button.textContent;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';
            button.disabled = true;
        } else {
            if (button.dataset.originalText) {
                button.textContent = button.dataset.originalText;
            } else {
                button.textContent = button.type === 'submit' ? 
                    (loginForm ? 'Iniciar sesión' : 'Crear cuenta') : 
                    'Continuar';
            }
            button.disabled = false;
        }
    }

    /* =========================
       LOGIN
    ========================= */
    if (loginForm) {
        console.log('✅ Formulario de login encontrado');
        
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;

            clearMessages();

            if (!email || !password) {
                showError('Por favor completa todos los campos');
                return;
            }

            if (!isValidEmail(email)) {
                showError('Por favor ingresa un email válido');
                return;
            }

            const submitBtn = loginForm.querySelector('button[type="submit"]');
            setLoading(submitBtn, true);

            try {
                console.log('📤 Enviando petición de login...');
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();
                console.log('📥 Respuesta del login:', data);
                
                setLoading(submitBtn, false);

                if (!response.ok) {
                    showError(data.error || 'Credenciales inválidas');
                    return;
                }

                showSuccess('Inicio de sesión exitoso. Redirigiendo...');

                setTimeout(() => {
                    // Redirección según rol
                    if (data.user.rol === 'admin') {
                        window.location.href = '/admin';
                    } else {
                        window.location.href = '/account';
                    }
                }, 1500);

            } catch (error) {
                console.error('❌ Error login:', error);
                setLoading(submitBtn, false);
                showError('Error de conexión. Intenta nuevamente.');
            }
        });
    }

    /* =========================
       REGISTRO
    ========================= */
    if (registerForm) {
        console.log('✅ Formulario de registro encontrado');
        
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            clearMessages();

            const formData = new FormData(registerForm);
            const data = Object.fromEntries(formData.entries());

            // Validaciones
            if (!data.nombre || !data.apellido || !data.email || !data.password) {
                showError('Por favor completa todos los campos obligatorios');
                return;
            }

            if (!isValidEmail(data.email)) {
                showError('Por favor ingresa un email válido');
                return;
            }

            if (data.password.length < 6) {
                showError('La contraseña debe tener al menos 6 caracteres');
                return;
            }

            const submitBtn = registerForm.querySelector('button[type="submit"]');
            setLoading(submitBtn, true);

            try {
                console.log('📤 Enviando petición de registro...');
                const response = await fetch('/api/register', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify(data)
                });

                const result = await response.json();
                console.log('📥 Respuesta del registro:', result);
                
                setLoading(submitBtn, false);

                if (!response.ok) {
                    showError(result.error || 'Error al registrar');
                    return;
                }

                showSuccess('Cuenta creada correctamente. Redirigiendo al login...');

                setTimeout(() => {
                    window.location.href = '/login?registered=true';
                }, 2000);

            } catch (error) {
                console.error('❌ Error registro:', error);
                setLoading(submitBtn, false);
                showError('Error de conexión con el servidor');
            }
        });
    }

    /* =========================
       UTILIDADES
    ========================= */
    function isValidEmail(email) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    }

    function clearMessages() {
        if (errorMessage) errorMessage.style.display = 'none';
        if (successMessage) successMessage.style.display = 'none';
    }

    function showError(message) {
        if (!errorMessage) {
            // Crear elemento si no existe
            const msgDiv = document.createElement('div');
            msgDiv.id = 'error-message';
            msgDiv.className = 'auth-message error';
            msgDiv.style.display = 'block';
            msgDiv.textContent = message;
            
            const form = loginForm || registerForm;
            if (form) {
                form.parentNode.insertBefore(msgDiv, form);
            }
            return;
        }
        
        errorMessage.textContent = message;
        errorMessage.className = 'auth-message error';
        errorMessage.style.display = 'block';
        
        // Scroll suave al mensaje
        errorMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function showSuccess(message) {
        if (!successMessage) {
            // Crear elemento si no existe
            const msgDiv = document.createElement('div');
            msgDiv.id = 'success-message';
            msgDiv.className = 'auth-message success';
            msgDiv.style.display = 'block';
            msgDiv.textContent = message;
            
            const form = loginForm || registerForm;
            if (form) {
                form.parentNode.insertBefore(msgDiv, form);
            }
            return;
        }
        
        successMessage.textContent = message;
        successMessage.className = 'auth-message success';
        successMessage.style.display = 'block';
        
        // Scroll suave al mensaje
        successMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Toggle password visibility
    document.querySelectorAll('.toggle-password').forEach(button => {
        button.addEventListener('click', function() {
            const input = this.previousElementSibling;
            const icon = this.querySelector('i');
            
            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                input.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
    });

    console.log('✅ Auth script inicializado correctamente');
});