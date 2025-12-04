// ==========================================
// AUTH.JS - Gestion de l'authentification
// ==========================================

const API_URL = 'http://localhost:3000/api';

// ==========================================
// ÉTAT DE L'AUTHENTIFICATION
// ==========================================
const authState = {
    isAuthenticated: false,
    currentUser: null,
    token: localStorage.getItem('authToken')
};

// ==========================================
// INITIALISATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    checkAuthentication();
    setupAuthEventListeners();
});

// ==========================================
// VÉRIFICATION DE L'AUTHENTIFICATION
// ==========================================
async function checkAuthentication() {
    if (!authState.token) {
        updateAuthUI();
        return;
    }

    try {
        const response = await fetch(`${API_URL}/auth/verify`, {
            headers: {
                'Authorization': `Bearer ${authState.token}`
            }
        });

        if (response.ok) {
            const userData = await response.json();
            authState.isAuthenticated = true;
            authState.currentUser = userData;
        } else {
            localStorage.removeItem('authToken');
            authState.token = null;
        }
    } catch (error) {
        console.error('Erreur vérification authentification:', error);
        localStorage.removeItem('authToken');
        authState.token = null;
    }

    updateAuthUI();
}

// ==========================================
// INSCRIPTION
// ==========================================
async function register(email, username, password) {
    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, username, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Erreur lors de l\'inscription');
        }

        // Auto-login après inscription
        await login(email, password);
        
        showNotification('Inscription réussie! Bienvenue!', 'success');
        return { success: true };

    } catch (error) {
        showNotification(error.message, 'error');
        return { success: false, error: error.message };
    }
}

// ==========================================
// CONNEXION
// ==========================================
async function login(email, password) {
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Identifiants incorrects');
        }

        // Sauvegarder le token
        authState.token = data.token;
        authState.isAuthenticated = true;
        authState.currentUser = data.user;

        localStorage.setItem('authToken', data.token);
        localStorage.setItem('userData', JSON.stringify(data.user));

        updateAuthUI();
        
        // Redirection vers la page d'accueil
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);

        showNotification('Connexion réussie! Bienvenue ' + data.user.username + '!', 'success');
        
        return { success: true };

    } catch (error) {
        showNotification(error.message, 'error');
        return { success: false, error: error.message };
    }
}

// ==========================================
// DÉCONNEXION
// ==========================================
function logout() {
    if (!confirm('Voulez-vous vraiment vous déconnecter?')) {
        return;
    }

    authState.isAuthenticated = false;
    authState.currentUser = null;
    authState.token = null;

    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');

    updateAuthUI();
    
    showNotification('Déconnexion réussie', 'info');
    
    // Redirection si sur une page nécessitant authentification
    if (window.location.pathname.includes('profile.html') || 
        window.location.pathname.includes('favorites.html')) {
        window.location.href = 'index.html';
    }
}

// ==========================================
// MISE À JOUR DE L'UI
// ==========================================
function updateAuthUI() {
    const authButtons = document.getElementById('auth-buttons');
    const userMenu = document.getElementById('user-menu');
    
    if (!authState.isAuthenticated) {
        // Mode non connecté
        if (authButtons) {
            authButtons.innerHTML = `
                <a href="login.html" class="btn-auth btn-login">Connexion</a>
                <a href="register.html" class="btn-auth btn-register">Inscription</a>
            `;
        }
        
        if (userMenu) {
            userMenu.style.display = 'none';
        }
        
        // Mettre à jour la navigation
        updateNavigation();
        
    } else {
        // Mode connecté
        if (authButtons) {
            authButtons.style.display = 'none';
        }
        
        if (userMenu) {
            userMenu.style.display = 'flex';
            userMenu.innerHTML = `
                <div class="user-info">
                    <span class="user-avatar">${authState.currentUser?.username?.charAt(0).toUpperCase()}</span>
                    <span class="user-name">${authState.currentUser?.username}</span>
                </div>
                <div class="user-dropdown">
                    <a href="profile.html" class="dropdown-item">
                        <i class="fas fa-user"></i> Mon profil
                    </a>
                    <a href="favorites.html" class="dropdown-item">
                        <i class="fas fa-heart"></i> Mes favoris
                    </a>
                    <hr>
                    <button class="dropdown-item btn-logout">
                        <i class="fas fa-sign-out-alt"></i> Déconnexion
                    </button>
                </div>
            `;
            
            // Ajouter l'événement de déconnexion
            const logoutBtn = userMenu.querySelector('.btn-logout');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', logout);
            }
        }
        
        // Mettre à jour la navigation
        updateNavigation();
    }
}

function updateNavigation() {
    const nav = document.querySelector('nav');
    if (!nav) return;
    
    // Ajouter le lien Favoris si connecté
    if (authState.isAuthenticated) {
        let favoritesLink = nav.querySelector('a[href="favorites.html"]');
        if (!favoritesLink) {
            const galleryLink = nav.querySelector('a[href="gallery.html"]');
            if (galleryLink) {
                const newLink = document.createElement('a');
                newLink.href = 'favorites.html';
                newLink.innerHTML = '<i class="fas fa-heart"></i> Favoris';
                galleryLink.parentNode.insertBefore(newLink, galleryLink.nextSibling);
            }
        }
    } else {
        // Retirer le lien Favoris si présent
        const favoritesLink = nav.querySelector('a[href="favorites.html"]');
        if (favoritesLink) {
            favoritesLink.remove();
        }
    }
}

// ==========================================
// VALIDATION DES FORMULAIRES
// ==========================================
function validateLoginForm(email, password) {
    const errors = [];
    
    if (!email || !email.includes('@')) {
        errors.push('Veuillez entrer une adresse email valide');
    }
    
    if (!password || password.length < 6) {
        errors.push('Le mot de passe doit contenir au moins 6 caractères');
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
}

function validateRegisterForm(email, username, password, confirmPassword) {
    const errors = [];
    
    if (!email || !email.includes('@')) {
        errors.push('Veuillez entrer une adresse email valide');
    }
    
    if (!username || username.length < 3) {
        errors.push('Le nom d\'utilisateur doit contenir au moins 3 caractères');
    }
    
    if (!password || password.length < 6) {
        errors.push('Le mot de passe doit contenir au moins 6 caractères');
    }
    
    if (password !== confirmPassword) {
        errors.push('Les mots de passe ne correspondent pas');
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
}

// ==========================================
// ÉVÉNEMENTS
// ==========================================
function setupAuthEventListeners() {
    // Formulaire de connexion
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            const validation = validateLoginForm(email, password);
            
            if (!validation.isValid) {
                showFormErrors(validation.errors);
                return;
            }
            
            await login(email, password);
        });
    }
    
    // Formulaire d'inscription
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            
            const validation = validateRegisterForm(email, username, password, confirmPassword);
            
            if (!validation.isValid) {
                showFormErrors(validation.errors);
                return;
            }
            
            await register(email, username, password);
        });
    }
    
    // Bouton de déconnexion global
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-logout') || 
            e.target.closest('.btn-logout')) {
            logout();
        }
    });
}

// ==========================================
// UTILITAIRES
// ==========================================
function showFormErrors(errors) {
    const errorContainer = document.getElementById('form-errors');
    
    if (!errorContainer) {
        // Créer le conteneur si inexistant
        const form = document.querySelector('form');
        if (form) {
            const container = document.createElement('div');
            container.id = 'form-errors';
            container.className = 'form-errors';
            form.prepend(container);
            errorContainer = container;
        }
    }
    
    if (errorContainer) {
        errorContainer.innerHTML = errors
            .map(error => `<div class="error-message"><i class="fas fa-exclamation-circle"></i> ${error}</div>`)
            .join('');
        errorContainer.style.display = 'block';
    }
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    const icon = type === 'success' ? 'fa-check-circle' : 
                 type === 'error' ? 'fa-exclamation-circle' : 
                 'fa-info-circle';
    
    notification.innerHTML = `
        <i class="fas ${icon}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => notification.classList.add('show'), 10);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ==========================================
// REQUÊTES AUTHENTIFIÉES
// ==========================================
async function fetchWithAuth(url, options = {}) {
    if (!authState.token) {
        throw new Error('Non authentifié');
    }
    
    const defaultOptions = {
        headers: {
            'Authorization': `Bearer ${authState.token}`,
            'Content-Type': 'application/json'
        }
    };
    
    const finalOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    };
    
    const response = await fetch(url, finalOptions);
    
    if (response.status === 401) {
        // Token expiré
        logout();
        throw new Error('Session expirée');
    }
    
    return response;
}

// ==========================================
// EXPORTATIONS
// ==========================================
window.authModule = {
    isAuthenticated: () => authState.isAuthenticated,
    getCurrentUser: () => authState.currentUser,
    getToken: () => authState.token,
    login,
    logout,
    register,
    fetchWithAuth,
    updateUI: updateAuthUI
};