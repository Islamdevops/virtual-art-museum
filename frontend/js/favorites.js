// ==========================================
// FAVORITES.JS - Gestion des favoris
// ==========================================

const API_URL = 'http://localhost:3000/api';
const STORAGE_KEY = 'artMuseumFavorites';

// ==========================================
// ÉTAT DES FAVORIS
// ==========================================
const favoritesState = {
    favoriteIds: [],
    favoriteArtworks: [],
    isLoading: false,
    syncEnabled: false
};

// ==========================================
// INITIALISATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    initializeFavorites();
});

async function initializeFavorites() {
    loadFavoritesFromLocalStorage();
    
    // Vérifier si l'utilisateur est connecté pour la synchronisation
    if (window.authModule && window.authModule.isAuthenticated()) {
        favoritesState.syncEnabled = true;
        await syncFavoritesWithServer();
    }
    
    // Si on est sur la page des favoris, charger et afficher
    if (window.location.pathname.includes('favorites.html')) {
        await loadAndDisplayFavorites();
    }
    
    setupFavoritesEventListeners();
}

function setupFavoritesEventListeners() {
    // Bouton de synchronisation
    const syncBtn = document.getElementById('sync-favorites-btn');
    if (syncBtn) {
        syncBtn.addEventListener('click', handleManualSync);
    }
    
    // Boutons de tri
    const sortButtons = document.querySelectorAll('.sort-btn');
    sortButtons.forEach(btn => {
        btn.addEventListener('click', handleSort);
    });
    
    // Bouton d'export
    const exportBtn = document.getElementById('export-favorites-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', handleExportFavorites);
    }
    
    // Bouton de suppression de tous les favoris
    const clearBtn = document.getElementById('clear-favorites-btn');
    if (clearBtn) {
        clearBtn.addEventListener('click', handleClearAllFavorites);
    }
}

// ==========================================
// CHARGEMENT DES FAVORIS
// ==========================================
function loadFavoritesFromLocalStorage() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        favoritesState.favoriteIds = stored ? JSON.parse(stored) : [];
        console.log(`${favoritesState.favoriteIds.length} favoris chargés depuis localStorage`);
    } catch (error) {
        console.error('Erreur chargement favoris:', error);
        favoritesState.favoriteIds = [];
    }
}

async function loadAndDisplayFavorites() {
    if (favoritesState.favoriteIds.length === 0) {
        displayEmptyFavorites();
        return;
    }
    
    try {
        favoritesState.isLoading = true;
        showFavoritesLoader();
        
        // Charger les détails de toutes les œuvres favorites
        const artworksPromises = favoritesState.favoriteIds.map(id => 
            fetch(`${API_URL}/artworks/${id}`).then(r => r.json())
        );
        
        const artworks = await Promise.all(artworksPromises);
        favoritesState.favoriteArtworks = artworks.filter(a => a !== null);
        
        displayFavorites(favoritesState.favoriteArtworks);
        updateFavoritesCount();
        
    } catch (error) {
        console.error('Erreur chargement favoris:', error);
        showFavoritesError('Impossible de charger vos favoris');
    } finally {
        favoritesState.isLoading = false;
        hideFavoritesLoader();
    }
}

// ==========================================
// AFFICHAGE DES FAVORIS
// ==========================================
function displayFavorites(artworks) {
    const container = document.getElementById('favorites-grid');
    
    if (!container) {
        console.warn('Conteneur favorites-grid introuvable');
        return;
    }
    
    if (artworks.length === 0) {
        displayEmptyFavorites();
        return;
    }
    
    container.innerHTML = artworks.map(artwork => createFavoriteCard(artwork)).join('');
    attachFavoriteCardEvents();
}

function createFavoriteCard(artwork) {
    return `
        <div class="favorite-card" data-id="${artwork.id}">
            <div class="favorite-image-container">
                <img src="${artwork.image}" 
                     alt="${artwork.title}" 
                     loading="lazy"
                     class="favorite-image">
                <div class="favorite-overlay">
                    <button class="btn-view-favorite" data-id="${artwork.id}" title="Voir en détail">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-remove-favorite" data-id="${artwork.id}" title="Retirer des favoris">
                        <i class="fas fa-heart-broken"></i>
                    </button>
                </div>
            </div>
            <div class="favorite-info">
                <h3 class="favorite-title">${artwork.title}</h3>
                <p class="favorite-artist">${artwork.artist}</p>
                <div class="favorite-meta">
                    <span class="favorite-year">${artwork.year}</span>
                    <span class="favorite-category">${artwork.category}</span>
                </div>
                <div class="favorite-actions">
                    <button class="btn-share" data-id="${artwork.id}" title="Partager">
                        <i class="fas fa-share-alt"></i>
                    </button>
                    <button class="btn-view-in-gallery" data-id="${artwork.id}" title="Voir dans la galerie">
                        <i class="fas fa-external-link-alt"></i>
                    </button>
                </div>
            </div>
            <div class="favorite-added-date">
                Ajouté ${getFavoriteAddedDate(artwork.id)}
            </div>
        </div>
    `;
}

function attachFavoriteCardEvents() {
    // Boutons de visualisation
    document.querySelectorAll('.btn-view-favorite').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const artworkId = parseInt(btn.dataset.id);
            viewArtworkDetails(artworkId);
        });
    });
    
    // Boutons de suppression
    document.querySelectorAll('.btn-remove-favorite').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const artworkId = parseInt(btn.dataset.id);
            removeFavorite(artworkId);
        });
    });
    
    // Boutons de partage
    document.querySelectorAll('.btn-share').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const artworkId = parseInt(btn.dataset.id);
            shareArtwork(artworkId);
        });
    });
    
    // Boutons "Voir dans la galerie"
    document.querySelectorAll('.btn-view-in-gallery').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const artworkId = parseInt(btn.dataset.id);
            window.location.href = `gallery.html?artwork=${artworkId}`;
        });
    });
}

function displayEmptyFavorites() {
    const container = document.getElementById('favorites-grid');
    if (container) {
        container.innerHTML = `
            <div class="empty-favorites">
                <i class="fas fa-heart-broken"></i>
                <h2>Aucun favori pour le moment</h2>
                <p>Explorez la galerie et ajoutez vos œuvres préférées!</p>
                <a href="gallery.html" class="btn-primary">
                    <i class="fas fa-images"></i> Découvrir la galerie
                </a>
            </div>
        `;
    }
}

// ==========================================
// GESTION DES FAVORIS
// ==========================================
function addFavorite(artworkId) {
    if (favoritesState.favoriteIds.includes(artworkId)) {
        return;
    }
    
    favoritesState.favoriteIds.push(artworkId);
    saveFavoritesToLocalStorage();
    
    // Synchroniser avec le serveur si connecté
    if (favoritesState.syncEnabled) {
        syncFavoriteToServer(artworkId, 'add');
    }
    
    updateFavoritesCount();
    showNotification('Ajouté aux favoris!', 'success');
}

function removeFavorite(artworkId) {
    const index = favoritesState.favoriteIds.indexOf(artworkId);
    if (index === -1) {
        return;
    }
    
    if (!confirm('Êtes-vous sûr de vouloir retirer cette œuvre de vos favoris?')) {
        return;
    }
    
    favoritesState.favoriteIds.splice(index, 1);
    saveFavoritesToLocalStorage();
    
    // Synchroniser avec le serveur si connecté
    if (favoritesState.syncEnabled) {
        syncFavoriteToServer(artworkId, 'remove');
    }
    
    // Retirer de la vue si on est sur la page des favoris
    favoritesState.favoriteArtworks = favoritesState.favoriteArtworks
        .filter(a => a.id !== artworkId);
    
    if (window.location.pathname.includes('favorites.html')) {
        displayFavorites(favoritesState.favoriteArtworks);
    }
    
    updateFavoritesCount();
    showNotification('Retiré des favoris', 'info');
}

function toggleFavorite(artworkId) {
    if (isFavorite(artworkId)) {
        removeFavorite(artworkId);
    } else {
        addFavorite(artworkId);
    }
}

function isFavorite(artworkId) {
    return favoritesState.favoriteIds.includes(artworkId);
}

function saveFavoritesToLocalStorage() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(favoritesState.favoriteIds));
    } catch (error) {
        console.error('Erreur sauvegarde favoris:', error);
    }
}

// ==========================================
// SYNCHRONISATION SERVEUR
// ==========================================
async function syncFavoritesWithServer() {
    if (!favoritesState.syncEnabled) return;
    
    try {
        // Récupérer les favoris du serveur
        const response = await window.authModule.fetchWithAuth(`${API_URL}/favorites`);
        
        if (!response.ok) {
            throw new Error('Erreur lors de la synchronisation');
        }
        
        const serverFavorites = await response.json();
        
        // Fusionner avec les favoris locaux
        const mergedFavorites = [...new Set([...favoritesState.favoriteIds, ...serverFavorites])];
        
        // Si différence, mettre à jour le serveur
        if (JSON.stringify(mergedFavorites.sort()) !== JSON.stringify(serverFavorites.sort())) {
            await updateServerFavorites(mergedFavorites);
        }
        
        favoritesState.favoriteIds = mergedFavorites;
        saveFavoritesToLocalStorage();
        
        console.log('Synchronisation des favoris réussie');
        
    } catch (error) {
        console.error('Erreur synchronisation favoris:', error);
    }
}

async function syncFavoriteToServer(artworkId, action) {
    if (!favoritesState.syncEnabled) return;
    
    try {
        const endpoint = action === 'add' 
            ? `${API_URL}/favorites/${artworkId}` 
            : `${API_URL}/favorites/${artworkId}`;
        
        const method = action === 'add' ? 'POST' : 'DELETE';
        
        await window.authModule.fetchWithAuth(endpoint, { method });
        
    } catch (error) {
        console.error('Erreur synchronisation favori:', error);
    }
}

async function updateServerFavorites(favoriteIds) {
    if (!favoritesState.syncEnabled) return;
    
    try {
        await window.authModule.fetchWithAuth(`${API_URL}/favorites`, {
            method: 'PUT',
            body: JSON.stringify({ favorites: favoriteIds })
        });
    } catch (error) {
        console.error('Erreur mise à jour favoris serveur:', error);
    }
}

async function handleManualSync() {
    const syncBtn = document.getElementById('sync-favorites-btn');
    
    if (!favoritesState.syncEnabled) {
        showNotification('Connectez-vous pour synchroniser vos favoris', 'info');
        return;
    }
    
    showButtonLoader(syncBtn, 'Synchronisation...');
    
    try {
        await syncFavoritesWithServer();
        await loadAndDisplayFavorites();
        showNotification('Favoris synchronisés!', 'success');
    } catch (error) {
        showNotification('Erreur lors de la synchronisation', 'error');
    } finally {
        hideButtonLoader(syncBtn, 'Synchroniser');
    }
}

// ==========================================
// TRI DES FAVORIS
// ==========================================
function handleSort(e) {
    const sortType = e.currentTarget.dataset.sort;
    
    // Mettre à jour l'état actif des boutons
    document.querySelectorAll('.sort-btn').forEach(btn => btn.classList.remove('active'));
    e.currentTarget.classList.add('active');
    
    let sorted = [...favoritesState.favoriteArtworks];
    
    switch (sortType) {
        case 'date-desc':
            sorted = sorted.sort((a, b) => 
                favoritesState.favoriteIds.indexOf(b.id) - favoritesState.favoriteIds.indexOf(a.id)
            );
            break;
        case 'date-asc':
            sorted = sorted.sort((a, b) => 
                favoritesState.favoriteIds.indexOf(a.id) - favoritesState.favoriteIds.indexOf(b.id)
            );
            break;
        case 'title':
            sorted = sorted.sort((a, b) => a.title.localeCompare(b.title));
            break;
        case 'artist':
            sorted = sorted.sort((a, b) => a.artist.localeCompare(b.artist));
            break;
        case 'year':
            sorted = sorted.sort((a, b) => parseInt(b.year) - parseInt(a.year));
            break;
    }
    
    displayFavorites(sorted);
}

// ==========================================
// ACTIONS SUPPLÉMENTAIRES
// ==========================================
function handleExportFavorites() {
    if (favoritesState.favoriteArtworks.length === 0) {
        showNotification('Aucun favori à exporter', 'info');
        return;
    }
    
    const exportData = favoritesState.favoriteArtworks.map(artwork => ({
        title: artwork.title,
        artist: artwork.artist,
        year: artwork.year,
        category: artwork.category,
        image: artwork.image
    }));
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `mes-favoris-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    showNotification('Favoris exportés!', 'success');
}

function handleClearAllFavorites() {
    if (favoritesState.favoriteIds.length === 0) {
        showNotification('Aucun favori à supprimer', 'info');
        return;
    }
    
    if (!confirm(`Êtes-vous sûr de vouloir supprimer tous vos favoris (${favoritesState.favoriteIds.length} œuvres)?`)) {
        return;
    }
    
    favoritesState.favoriteIds = [];
    favoritesState.favoriteArtworks = [];
    saveFavoritesToLocalStorage();
    
    if (favoritesState.syncEnabled) {
        updateServerFavorites([]);
    }
    
    displayEmptyFavorites();
    updateFavoritesCount();
    
    showNotification('Tous les favoris ont été supprimés', 'info');
}

function viewArtworkDetails(artworkId) {
    // Ouvrir un modal ou rediriger vers la galerie
    window.location.href = `gallery.html?artwork=${artworkId}`;
}

function shareArtwork(artworkId) {
    const artwork = favoritesState.favoriteArtworks.find(a => a.id === artworkId);
    
    if (!artwork) return;
    
    const shareData = {
        title: artwork.title,
        text: `Découvrez "${artwork.title}" de ${artwork.artist} sur notre musée virtuel!`,
        url: `${window.location.origin}/gallery.html?artwork=${artworkId}`
    };
    
    if (navigator.share) {
        navigator.share(shareData)
            .then(() => showNotification('Partagé avec succès!', 'success'))
            .catch(err => console.log('Erreur partage:', err));
    } else {
        // Fallback: copier le lien
        navigator.clipboard.writeText(shareData.url)
            .then(() => showNotification('Lien copié dans le presse-papier!', 'success'))
            .catch(() => showNotification('Impossible de copier le lien', 'error'));
    }
}

// ==========================================
// UTILITAIRES
// ==========================================
function updateFavoritesCount() {
    const count = favoritesState.favoriteIds.length;
    
    // Mettre à jour tous les compteurs de favoris
    document.querySelectorAll('.favorites-count').forEach(el => {
        el.textContent = count;
    });
    
    // Mettre à jour le titre de la page
    const pageTitle = document.querySelector('.favorites-page-title');
    if (pageTitle) {
        pageTitle.textContent = `Mes Favoris (${count})`;
    }
}

function getFavoriteAddedDate(artworkId) {
    // Cette fonction nécessiterait un système de tracking plus avancé
    // Pour l'instant, on retourne un placeholder
    return 'récemment';
}

function showFavoritesLoader() {
    const container = document.getElementById('favorites-grid');
    if (container) {
        container.innerHTML = `
            <div class="favorites-loader">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Chargement de vos favoris...</p>
            </div>
        `;
    }
}

function hideFavoritesLoader() {
    const loader = document.querySelector('.favorites-loader');
    if (loader) loader.remove();
}

function showFavoritesError(message) {
    const container = document.getElementById('favorites-grid');
    if (container) {
        container.innerHTML = `
            <div class="favorites-error">
                <i class="fas fa-exclamation-triangle"></i>
                <p>${message}</p>
                <button onclick="window.location.reload()" class="btn-retry">Réessayer</button>
            </div>
        `;
    }
}

function showButtonLoader(button, text) {
    button.disabled = true;
    button.dataset.originalHtml = button.innerHTML;
    button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${text}`;
}

function hideButtonLoader(button, text) {
    button.disabled = false;
    button.innerHTML = button.dataset.originalHtml || text;
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
// EXPORTATIONS
// ==========================================
window.favoritesModule = {
    add: addFavorite,
    remove: removeFavorite,
    toggle: toggleFavorite,
    isFavorite: isFavorite,
    getAll: () => favoritesState.favoriteIds,
    getCount: () => favoritesState.favoriteIds.length,
    sync: syncFavoritesWithServer
};