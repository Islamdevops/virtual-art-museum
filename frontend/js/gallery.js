// ==========================================
// GALLERY.JS - Gestion de la galerie d'art
// ==========================================

const API_URL = 'http://localhost:3000/api';

// ==========================================
// ÉTAT DE L'APPLICATION
// ==========================================
const state = {
    artworks: [],
    filteredArtworks: [],
    currentFilters: {
        artist: 'all',
        century: 'all',
        category: 'all',
        search: ''
    },
    currentLightbox: null
};

// ==========================================
// INITIALISATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    initializeGallery();
    setupEventListeners();
});

async function initializeGallery() {
    try {
        showLoader();
        await loadArtworks();
        populateFilters();
        displayArtworks(state.artworks);
        hideLoader();
    } catch (error) {
        console.error('Erreur initialisation galerie:', error);
        showError('Impossible de charger les œuvres. Veuillez réessayer.');
    }
}

// ==========================================
// CHARGEMENT DES DONNÉES
// ==========================================
async function loadArtworks() {
    try {
        const response = await fetch(`${API_URL}/artworks`);
        if (!response.ok) throw new Error('Erreur réseau');
        
        const data = await response.json();
        state.artworks = data;
        state.filteredArtworks = data;
        
        console.log(`${data.length} œuvres chargées`);
    } catch (error) {
        console.error('Erreur chargement œuvres:', error);
        // Données de fallback pour développement
        state.artworks = getFallbackArtworks();
        state.filteredArtworks = state.artworks;
    }
}

// ==========================================
// AFFICHAGE DE LA GALERIE
// ==========================================
function displayArtworks(artworks) {
    const galleryGrid = document.getElementById('gallery-grid');
    
    if (!galleryGrid) {
        console.error('Élément gallery-grid introuvable');
        return;
    }
    
    if (artworks.length === 0) {
        galleryGrid.innerHTML = `
            <div class="no-results">
                <p>Aucune œuvre ne correspond à vos critères</p>
                <button onclick="resetFilters()" class="btn-reset">Réinitialiser les filtres</button>
            </div>
        `;
        return;
    }
    
    galleryGrid.innerHTML = artworks.map(artwork => createArtworkCard(artwork)).join('');
    
    // Ajouter les événements après création du DOM
    attachCardEvents();
}

function createArtworkCard(artwork) {
    const isFavorite = checkIfFavorite(artwork.id);
    
    return `
        <div class="artwork-card" data-id="${artwork.id}">
            <div class="artwork-image-container">
                <img src="${artwork.image}" 
                     alt="${artwork.title}" 
                     loading="lazy"
                     class="artwork-image">
                <div class="artwork-overlay">
                    <button class="btn-view" data-id="${artwork.id}" title="Voir en grand">
                        <i class="fas fa-search-plus"></i>
                    </button>
                    <button class="btn-favorite ${isFavorite ? 'active' : ''}" 
                            data-id="${artwork.id}" 
                            title="Ajouter aux favoris">
                        <i class="fas fa-heart"></i>
                    </button>
                </div>
            </div>
            <div class="artwork-info">
                <h3 class="artwork-title">${artwork.title}</h3>
                <p class="artwork-artist">${artwork.artist}</p>
                <div class="artwork-meta">
                    <span class="artwork-year">${artwork.year}</span>
                    <span class="artwork-category">${artwork.category}</span>
                </div>
            </div>
        </div>
    `;
}

function attachCardEvents() {
    // Événements pour visualisation lightbox
    document.querySelectorAll('.btn-view').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const artworkId = parseInt(btn.dataset.id);
            openLightbox(artworkId);
        });
    });
    
    // Événements pour favoris
    document.querySelectorAll('.btn-favorite').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const artworkId = parseInt(btn.dataset.id);
            toggleFavorite(artworkId, btn);
        });
    });
    
    // Clic sur la carte entière pour lightbox
    document.querySelectorAll('.artwork-card').forEach(card => {
        card.addEventListener('click', () => {
            const artworkId = parseInt(card.dataset.id);
            openLightbox(artworkId);
        });
    });
}

// ==========================================
// LIGHTBOX
// ==========================================
function openLightbox(artworkId) {
    const artwork = state.artworks.find(a => a.id === artworkId);
    if (!artwork) return;
    
    state.currentLightbox = artworkId;
    
    const lightboxHTML = `
        <div class="lightbox" id="lightbox">
            <div class="lightbox-overlay"></div>
            <div class="lightbox-content">
                <button class="lightbox-close" id="lightbox-close">
                    <i class="fas fa-times"></i>
                </button>
                
                <button class="lightbox-nav lightbox-prev" id="lightbox-prev">
                    <i class="fas fa-chevron-left"></i>
                </button>
                
                <div class="lightbox-main">
                    <img src="${artwork.image}" 
                         alt="${artwork.title}" 
                         class="lightbox-image">
                    
                    <div class="lightbox-info">
                        <h2>${artwork.title}</h2>
                        <h3>${artwork.artist}</h3>
                        <div class="lightbox-details">
                            <p><strong>Année :</strong> ${artwork.year}</p>
                            <p><strong>Catégorie :</strong> ${artwork.category}</p>
                            <p><strong>Technique :</strong> ${artwork.technique || 'Non spécifié'}</p>
                            <p><strong>Dimensions :</strong> ${artwork.dimensions || 'Non spécifié'}</p>
                        </div>
                        <p class="lightbox-description">${artwork.description || 'Pas de description disponible.'}</p>
                        
                        <div class="lightbox-actions">
                            <button class="btn-lightbox-favorite ${checkIfFavorite(artwork.id) ? 'active' : ''}" 
                                    data-id="${artwork.id}">
                                <i class="fas fa-heart"></i> 
                                ${checkIfFavorite(artwork.id) ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                            </button>
                        </div>
                    </div>
                </div>
                
                <button class="lightbox-nav lightbox-next" id="lightbox-next">
                    <i class="fas fa-chevron-right"></i>
                </button>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', lightboxHTML);
    document.body.style.overflow = 'hidden';
    
    setupLightboxEvents();
}

function setupLightboxEvents() {
    const lightbox = document.getElementById('lightbox');
    const closeBtn = document.getElementById('lightbox-close');
    const prevBtn = document.getElementById('lightbox-prev');
    const nextBtn = document.getElementById('lightbox-next');
    const overlay = lightbox.querySelector('.lightbox-overlay');
    
    // Fermeture
    closeBtn.addEventListener('click', closeLightbox);
    overlay.addEventListener('click', closeLightbox);
    
    // Navigation
    prevBtn.addEventListener('click', () => navigateLightbox(-1));
    nextBtn.addEventListener('click', () => navigateLightbox(1));
    
    // Clavier
    document.addEventListener('keydown', handleLightboxKeyboard);
    
    // Favori dans lightbox
    const favBtn = lightbox.querySelector('.btn-lightbox-favorite');
    favBtn.addEventListener('click', () => {
        const artworkId = parseInt(favBtn.dataset.id);
        toggleFavorite(artworkId, favBtn);
        favBtn.innerHTML = checkIfFavorite(artworkId) 
            ? '<i class="fas fa-heart"></i> Retirer des favoris'
            : '<i class="fas fa-heart"></i> Ajouter aux favoris';
        favBtn.classList.toggle('active');
    });
}

function closeLightbox() {
    const lightbox = document.getElementById('lightbox');
    if (lightbox) {
        lightbox.remove();
        document.body.style.overflow = '';
        state.currentLightbox = null;
        document.removeEventListener('keydown', handleLightboxKeyboard);
    }
}

function navigateLightbox(direction) {
    const currentIndex = state.filteredArtworks.findIndex(a => a.id === state.currentLightbox);
    let newIndex = currentIndex + direction;
    
    if (newIndex < 0) newIndex = state.filteredArtworks.length - 1;
    if (newIndex >= state.filteredArtworks.length) newIndex = 0;
    
    closeLightbox();
    openLightbox(state.filteredArtworks[newIndex].id);
}

function handleLightboxKeyboard(e) {
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') navigateLightbox(-1);
    if (e.key === 'ArrowRight') navigateLightbox(1);
}

// ==========================================
// FILTRES
// ==========================================
function setupEventListeners() {
    const filterArtist = document.getElementById('filter-artist');
    const filterCentury = document.getElementById('filter-century');
    const filterCategory = document.getElementById('filter-category');
    const searchInput = document.getElementById('search-input');
    const resetBtn = document.getElementById('reset-filters');
    
    if (filterArtist) {
        filterArtist.addEventListener('change', (e) => {
            state.currentFilters.artist = e.target.value;
            applyFilters();
        });
    }
    
    if (filterCentury) {
        filterCentury.addEventListener('change', (e) => {
            state.currentFilters.century = e.target.value;
            applyFilters();
        });
    }
    
    if (filterCategory) {
        filterCategory.addEventListener('change', (e) => {
            state.currentFilters.category = e.target.value;
            applyFilters();
        });
    }
    
    if (searchInput) {
        searchInput.addEventListener('input', debounce((e) => {
            state.currentFilters.search = e.target.value.toLowerCase();
            applyFilters();
        }, 300));
    }
    
    if (resetBtn) {
        resetBtn.addEventListener('click', resetFilters);
    }
}

function populateFilters() {
    const artists = [...new Set(state.artworks.map(a => a.artist))].sort();
    const centuries = [...new Set(state.artworks.map(a => getCentury(a.year)))].sort();
    const categories = [...new Set(state.artworks.map(a => a.category))].sort();
    
    populateSelect('filter-artist', artists);
    populateSelect('filter-century', centuries);
    populateSelect('filter-category', categories);
}

function populateSelect(selectId, options) {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    options.forEach(option => {
        const opt = document.createElement('option');
        opt.value = option;
        opt.textContent = option;
        select.appendChild(opt);
    });
}

function applyFilters() {
    let filtered = [...state.artworks];
    
    // Filtre artiste
    if (state.currentFilters.artist !== 'all') {
        filtered = filtered.filter(a => a.artist === state.currentFilters.artist);
    }
    
    // Filtre siècle
    if (state.currentFilters.century !== 'all') {
        filtered = filtered.filter(a => getCentury(a.year) === state.currentFilters.century);
    }
    
    // Filtre catégorie
    if (state.currentFilters.category !== 'all') {
        filtered = filtered.filter(a => a.category === state.currentFilters.category);
    }
    
    // Recherche textuelle
    if (state.currentFilters.search) {
        filtered = filtered.filter(a => 
            a.title.toLowerCase().includes(state.currentFilters.search) ||
            a.artist.toLowerCase().includes(state.currentFilters.search) ||
            (a.description && a.description.toLowerCase().includes(state.currentFilters.search))
        );
    }
    
    state.filteredArtworks = filtered;
    displayArtworks(filtered);
    updateResultsCount(filtered.length);
}

function resetFilters() {
    state.currentFilters = {
        artist: 'all',
        century: 'all',
        category: 'all',
        search: ''
    };
    
    document.getElementById('filter-artist').value = 'all';
    document.getElementById('filter-century').value = 'all';
    document.getElementById('filter-category').value = 'all';
    document.getElementById('search-input').value = '';
    
    state.filteredArtworks = state.artworks;
    displayArtworks(state.artworks);
    updateResultsCount(state.artworks.length);
}

function updateResultsCount(count) {
    const countElement = document.getElementById('results-count');
    if (countElement) {
        countElement.textContent = `${count} œuvre${count > 1 ? 's' : ''} trouvée${count > 1 ? 's' : ''}`;
    }
}

// ==========================================
// FAVORIS (LocalStorage)
// ==========================================
function checkIfFavorite(artworkId) {
    const favorites = JSON.parse(localStorage.getItem('artMuseumFavorites') || '[]');
    return favorites.includes(artworkId);
}

function toggleFavorite(artworkId, button) {
    let favorites = JSON.parse(localStorage.getItem('artMuseumFavorites') || '[]');
    
    if (favorites.includes(artworkId)) {
        favorites = favorites.filter(id => id !== artworkId);
        showNotification('Retiré des favoris', 'info');
    } else {
        favorites.push(artworkId);
        showNotification('Ajouté aux favoris', 'success');
    }
    
    localStorage.setItem('artMuseumFavorites', JSON.stringify(favorites));
    
    if (button) {
        button.classList.toggle('active');
    }
    
    // Mettre à jour tous les boutons pour cette œuvre
    document.querySelectorAll(`[data-id="${artworkId}"]`).forEach(btn => {
        if (btn.classList.contains('btn-favorite') || btn.classList.contains('btn-lightbox-favorite')) {
            btn.classList.toggle('active', favorites.includes(artworkId));
        }
    });
}

// ==========================================
// UTILITAIRES
// ==========================================
function getCentury(year) {
    const yearNum = parseInt(year);
    if (isNaN(yearNum)) return 'Inconnu';
    return `${Math.ceil(yearNum / 100)}e siècle`;
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function showLoader() {
    const loader = document.getElementById('loader');
    if (loader) loader.style.display = 'flex';
}

function hideLoader() {
    const loader = document.getElementById('loader');
    if (loader) loader.style.display = 'none';
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    
    setTimeout(() => errorDiv.remove(), 5000);
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ==========================================
// DONNÉES DE FALLBACK
// ==========================================
function getFallbackArtworks() {
    return [
        {
            id: 1,
            title: "La Joconde",
            artist: "Léonard de Vinci",
            year: "1503",
            category: "Portrait",
            technique: "Huile sur bois",
            dimensions: "77 × 53 cm",
            image: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg/800px-Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg",
            description: "Portrait de Lisa Gherardini, chef-d'œuvre de la Renaissance italienne."
        },
        {
            id: 2,
            title: "La Nuit étoilée",
            artist: "Vincent van Gogh",
            year: "1889",
            category: "Paysage",
            technique: "Huile sur toile",
            dimensions: "73.7 × 92.1 cm",
            image: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/1280px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg",
            description: "Vue nocturne de Saint-Rémy-de-Provence, icône du post-impressionnisme."
        }
    ];
}

// Exposer certaines fonctions globalement
window.resetFilters = resetFilters;
window.toggleFavorite = toggleFavorite;