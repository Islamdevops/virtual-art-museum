// ==========================================
// COMMENTS.JS - Gestion des commentaires
// ==========================================

const API_URL = 'http://localhost:3000/api';

// ==========================================
// ÉTAT DES COMMENTAIRES
// ==========================================
const commentsState = {
    currentArtworkId: null,
    comments: [],
    isLoading: false,
    isPosting: false
};

// ==========================================
// INITIALISATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    setupCommentsEventListeners();
    
    // Charger les commentaires si artworkId présent dans l'URL
    const urlParams = new URLSearchParams(window.location.search);
    const artworkId = urlParams.get('artwork');
    
    if (artworkId) {
        loadComments(parseInt(artworkId));
    }
});

// ==========================================
// CHARGEMENT DES COMMENTAIRES
// ==========================================
async function loadComments(artworkId) {
    if (!artworkId) return;
    
    commentsState.currentArtworkId = artworkId;
    commentsState.isLoading = true;
    
    try {
        showCommentsLoader();
        
        const response = await fetch(`${API_URL}/artworks/${artworkId}/comments`);
        
        if (!response.ok) {
            throw new Error('Erreur lors du chargement des commentaires');
        }
        
        commentsState.comments = await response.json();
        displayComments(commentsState.comments);
        
    } catch (error) {
        console.error('Erreur chargement commentaires:', error);
        displayCommentsError();
    } finally {
        commentsState.isLoading = false;
        hideCommentsLoader();
    }
}

// ==========================================
// AFFICHAGE DES COMMENTAIRES
// ==========================================
function displayComments(comments) {
    const container = document.getElementById('comments-list');
    const lightboxContainer = document.getElementById('lightbox-comments-list');
    
    const targetContainer = container || lightboxContainer;
    
    if (!targetContainer) {
        console.warn('Conteneur de commentaires introuvable');
        return;
    }
    
    if (comments.length === 0) {
        targetContainer.innerHTML = `
            <div class="no-comments">
                <i class="fas fa-comment-slash"></i>
                <p>Soyez le premier à commenter cette œuvre!</p>
            </div>
        `;
        return;
    }
    
    // Trier par date (plus récent en premier)
    const sortedComments = [...comments].sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
    );
    
    targetContainer.innerHTML = sortedComments.map(comment => createCommentCard(comment)).join('');
    updateCommentsCount(comments.length);
}

function createCommentCard(comment) {
    const date = new Date(comment.createdAt).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    const isCurrentUser = window.authModule?.getCurrentUser()?.id === comment.userId;
    
    return `
        <div class="comment-card" data-comment-id="${comment.id}">
            <div class="comment-header">
                <div class="comment-user">
                    <div class="user-avatar">${comment.userName?.charAt(0).toUpperCase() || 'U'}</div>
                    <div class="user-info">
                        <strong>${comment.userName || 'Utilisateur'}</strong>
                        <span class="comment-date">${date}</span>
                    </div>
                </div>
                ${isCurrentUser ? `
                    <div class="comment-actions">
                        <button class="btn-edit-comment" data-id="${comment.id}" title="Modifier">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-delete-comment" data-id="${comment.id}" title="Supprimer">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                ` : ''}
            </div>
            <div class="comment-content">
                <p>${comment.content}</p>
            </div>
            <div class="comment-rating">
                ${createRatingStars(comment.rating)}
            </div>
        </div>
    `;
}

function createRatingStars(rating) {
    if (!rating) return '<span class="no-rating">Pas de note</span>';
    
    const stars = [];
    for (let i = 1; i <= 5; i++) {
        if (i <= rating) {
            stars.push('<i class="fas fa-star"></i>');
        } else {
            stars.push('<i class="far fa-star"></i>');
        }
    }
    return stars.join('') + ` <span class="rating-value">(${rating}/5)</span>`;
}

// ==========================================
// AJOUT DE COMMENTAIRE
// ==========================================
async function addComment(content, rating = null) {
    if (!commentsState.currentArtworkId) {
        showNotification('Aucune œuvre sélectionnée', 'error');
        return;
    }
    
    if (!window.authModule?.isAuthenticated()) {
        showNotification('Veuillez vous connecter pour commenter', 'error');
        return;
    }
    
    if (!content.trim()) {
        showNotification('Veuillez écrire un commentaire', 'error');
        return;
    }
    
    commentsState.isPosting = true;
    
    try {
        const response = await window.authModule.fetchWithAuth(
            `${API_URL}/artworks/${commentsState.currentArtworkId}/comments`,
            {
                method: 'POST',
                body: JSON.stringify({ 
                    content, 
                    rating: rating ? parseInt(rating) : null 
                })
            }
        );
        
        if (!response.ok) {
            throw new Error('Erreur lors de l\'ajout du commentaire');
        }
        
        const newComment = await response.json();
        
        // Ajouter au début de la liste
        commentsState.comments.unshift(newComment);
        displayComments(commentsState.comments);
        
        // Réinitialiser le formulaire
        const commentInput = document.getElementById('comment-input');
        const ratingInput = document.getElementById('comment-rating');
        
        if (commentInput) commentInput.value = '';
        if (ratingInput) ratingInput.value = '';
        
        showNotification('Commentaire ajouté avec succès!', 'success');
        
    } catch (error) {
        console.error('Erreur ajout commentaire:', error);
        showNotification(error.message, 'error');
    } finally {
        commentsState.isPosting = false;
    }
}

// ==========================================
// MODIFICATION DE COMMENTAIRE
// ==========================================
async function updateComment(commentId, content, rating = null) {
    try {
        const response = await window.authModule.fetchWithAuth(
            `${API_URL}/comments/${commentId}`,
            {
                method: 'PUT',
                body: JSON.stringify({ content, rating: rating ? parseInt(rating) : null })
            }
        );
        
        if (!response.ok) {
            throw new Error('Erreur lors de la modification');
        }
        
        const updatedComment = await response.json();
        
        // Mettre à jour dans la liste
        const index = commentsState.comments.findIndex(c => c.id === commentId);
        if (index !== -1) {
            commentsState.comments[index] = updatedComment;
        }
        
        displayComments(commentsState.comments);
        showNotification('Commentaire modifié avec succès!', 'success');
        
    } catch (error) {
        console.error('Erreur modification commentaire:', error);
        showNotification(error.message, 'error');
    }
}

// ==========================================
// SUPPRESSION DE COMMENTAIRE
// ==========================================
async function deleteComment(commentId) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce commentaire?')) {
        return;
    }
    
    try {
        const response = await window.authModule.fetchWithAuth(
            `${API_URL}/comments/${commentId}`,
            { method: 'DELETE' }
        );
        
        if (!response.ok) {
            throw new Error('Erreur lors de la suppression');
        }
        
        // Retirer de la liste
        commentsState.comments = commentsState.comments.filter(c => c.id !== commentId);
        displayComments(commentsState.comments);
        
        showNotification('Commentaire supprimé avec succès!', 'success');
        
    } catch (error) {
        console.error('Erreur suppression commentaire:', error);
        showNotification(error.message, 'error');
    }
}

// ==========================================
// ÉVÉNEMENTS
// ==========================================
function setupCommentsEventListeners() {
    // Soumission de commentaire
    const commentForm = document.getElementById('comment-form');
    const submitBtn = document.getElementById('submit-comment');
    
    if (submitBtn) {
        submitBtn.addEventListener('click', handleCommentSubmit);
    }
    
    if (commentForm) {
        commentForm.addEventListener('submit', (e) => {
            e.preventDefault();
            handleCommentSubmit();
        });
    }
    
    // Éditeur de commentaire en temps réel
    const commentInput = document.getElementById('comment-input');
    if (commentInput) {
        commentInput.addEventListener('input', updateCommentCounter);
    }
    
    // Délégation d'événements pour les actions de commentaires
    document.addEventListener('click', (e) => {
        // Édition de commentaire
        if (e.target.closest('.btn-edit-comment')) {
            const btn = e.target.closest('.btn-edit-comment');
            const commentId = parseInt(btn.dataset.id);
            const comment = commentsState.comments.find(c => c.id === commentId);
            
            if (comment) {
                openCommentEditor(comment);
            }
        }
        
        // Suppression de commentaire
        if (e.target.closest('.btn-delete-comment')) {
            const btn = e.target.closest('.btn-delete-comment');
            const commentId = parseInt(btn.dataset.id);
            deleteComment(commentId);
        }
    });
}

function handleCommentSubmit() {
    const commentInput = document.getElementById('comment-input');
    const ratingInput = document.getElementById('comment-rating');
    
    if (!commentInput) {
        console.warn('Champ commentaire introuvable');
        return;
    }
    
    const content = commentInput.value.trim();
    const rating = ratingInput ? ratingInput.value : null;
    
    addComment(content, rating);
}

function openCommentEditor(comment) {
    // Remplacer le contenu par un formulaire d'édition
    const commentCard = document.querySelector(`[data-comment-id="${comment.id}"]`);
    if (!commentCard) return;
    
    commentCard.innerHTML = `
        <div class="comment-edit-form">
            <textarea id="edit-comment-input" class="edit-comment-input">${comment.content}</textarea>
            <div class="edit-rating">
                <label>Note :</label>
                <select id="edit-comment-rating">
                    <option value="">Sans note</option>
                    <option value="1" ${comment.rating === 1 ? 'selected' : ''}>1 étoile</option>
                    <option value="2" ${comment.rating === 2 ? 'selected' : ''}>2 étoiles</option>
                    <option value="3" ${comment.rating === 3 ? 'selected' : ''}>3 étoiles</option>
                    <option value="4" ${comment.rating === 4 ? 'selected' : ''}>4 étoiles</option>
                    <option value="5" ${comment.rating === 5 ? 'selected' : ''}>5 étoiles</option>
                </select>
            </div>
            <div class="edit-actions">
                <button class="btn-save-comment" data-id="${comment.id}">Enregistrer</button>
                <button class="btn-cancel-edit">Annuler</button>
            </div>
        </div>
    `;
    
    // Événements pour l'édition
    const saveBtn = commentCard.querySelector('.btn-save-comment');
    const cancelBtn = commentCard.querySelector('.btn-cancel-edit');
    
    saveBtn.addEventListener('click', () => {
        const newContent = commentCard.querySelector('#edit-comment-input').value.trim();
        const newRating = commentCard.querySelector('#edit-comment-rating').value;
        
        if (newContent) {
            updateComment(comment.id, newContent, newRating);
        }
    });
    
    cancelBtn.addEventListener('click', () => {
        displayComments(commentsState.comments);
    });
}

// ==========================================
// UTILITAIRES
// ==========================================
function updateCommentCounter() {
    const commentInput = document.getElementById('comment-input');
    const counter = document.getElementById('comment-counter');
    
    if (!commentInput || !counter) return;
    
    const length = commentInput.value.length;
    counter.textContent = `${length}/500`;
    
    if (length > 500) {
        counter.classList.add('error');
    } else {
        counter.classList.remove('error');
    }
}

function updateCommentsCount(count) {
    const countElements = document.querySelectorAll('.comments-count');
    countElements.forEach(el => {
        el.textContent = count;
    });
}

function showCommentsLoader() {
    const container = document.getElementById('comments-list') || 
                      document.getElementById('lightbox-comments-list');
    
    if (container) {
        container.innerHTML = `
            <div class="comments-loader">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Chargement des commentaires...</p>
            </div>
        `;
    }
}

function hideCommentsLoader() {
    const loader = document.querySelector('.comments-loader');
    if (loader) loader.remove();
}

function displayCommentsError() {
    const container = document.getElementById('comments-list') || 
                      document.getElementById('lightbox-comments-list');
    
    if (container) {
        container.innerHTML = `
            <div class="comments-error">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Impossible de charger les commentaires</p>
                <button onclick="window.location.reload()" class="btn-retry">
                    Réessayer
                </button>
            </div>
        `;
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
// EXPORTATIONS
// ==========================================
window.commentsModule = {
    load: loadComments,
    add: addComment,
    update: updateComment,
    delete: deleteComment,
    getAll: () => commentsState.comments,
    getCurrentArtworkId: () => commentsState.currentArtworkId
};