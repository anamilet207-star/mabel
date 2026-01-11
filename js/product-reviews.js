// js/product-reviews.js
class ProductReviewsManager {
    constructor(productId) {
        this.productId = productId;
        this.reviews = [];
        this.currentPage = 1;
        this.reviewsPerPage = 5;
        this.currentUserRating = 0;
        this.init();
    }
    
    async init() {
        console.log('📝 Inicializando gestor de reseñas para producto:', this.productId);
        
        // Cargar reseñas existentes
        await this.loadReviews();
        
        // Renderizar sección de reseñas
        this.renderReviewsSection();
        
        // Configurar event listeners
        this.setupEventListeners();
    }
    
    async loadReviews() {
        try {
            const response = await fetch(`/api/products/${this.productId}/reviews`);
            
            if (!response.ok) {
                console.warn('No se pudieron cargar las reseñas');
                return;
            }
            
            this.reviews = await response.json();
            console.log(`✅ Reseñas cargadas: ${this.reviews.length}`);
            
        } catch (error) {
            console.error('❌ Error cargando reseñas:', error);
            this.reviews = [];
        }
    }
    
    renderReviewsSection() {
        const reviewsSection = document.getElementById('product-reviews-section');
        if (!reviewsSection) {
            this.createReviewsSection();
        }
        
        this.renderReviewsStats();
        this.renderReviewsList();
        this.renderPagination();
    }
    
    createReviewsSection() {
        const productDetailContainer = document.querySelector('.product-detail-section');
        if (!productDetailContainer) return;
        
        // Insertar después de la sección de recomendaciones
        const recommendationsSection = document.querySelector('.product-recommendations');
        const reviewsHTML = `
            <div class="product-reviews-section" id="product-reviews-section">
                <div class="reviews-header">
                    <h2>RESEÑAS DE CLIENTES</h2>
                    <button class="write-review-btn" id="write-review-btn">
                        <i class="fas fa-pen"></i> Escribir Reseña
                    </button>
                </div>
                
                <div class="reviews-stats" id="reviews-stats">
                    <!-- Estadísticas se cargarán aquí -->
                </div>
                
                <div class="reviews-list" id="reviews-list">
                    <!-- Lista de reseñas se cargará aquí -->
                </div>
                
                <div class="reviews-pagination" id="reviews-pagination">
                    <!-- Paginación se cargará aquí -->
                </div>
            </div>
            
            <!-- Modal para escribir reseña -->
            <div class="review-modal" id="review-modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>ESCRIBIR RESEÑA</h3>
                        <button class="close-modal" id="close-modal">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="review-form">
                            <div class="rating-input">
                                <label>Tu calificación</label>
                                <div class="stars-selector" id="stars-selector">
                                    <span class="star-selector" data-rating="1">★</span>
                                    <span class="star-selector" data-rating="2">★</span>
                                    <span class="star-selector" data-rating="3">★</span>
                                    <span class="star-selector" data-rating="4">★</span>
                                    <span class="star-selector" data-rating="5">★</span>
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label for="review-title">Título de la reseña</label>
                                <input type="text" id="review-title" class="form-control" 
                                       placeholder="Resume tu experiencia" maxlength="100" required>
                            </div>
                            
                            <div class="form-group">
                                <label for="review-comment">Tu reseña</label>
                                <textarea id="review-comment" class="form-control" 
                                          placeholder="Comparte tu experiencia con este producto..." 
                                          rows="5" required></textarea>
                            </div>
                            
                            <div class="modal-footer">
                                <button type="button" class="btn btn-outline" id="cancel-review">
                                    Cancelar
                                </button>
                                <button type="submit" class="btn" id="submit-review">
                                    <i class="fas fa-paper-plane"></i> Enviar Reseña
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;
        
        if (recommendationsSection) {
            recommendationsSection.insertAdjacentHTML('afterend', reviewsHTML);
        } else {
            productDetailContainer.insertAdjacentHTML('beforeend', reviewsHTML);
        }
    }
    
    renderReviewsStats() {
        const statsContainer = document.getElementById('reviews-stats');
        if (!statsContainer) return;
        
        if (this.reviews.length === 0) {
            statsContainer.innerHTML = `
                <div class="no-reviews">
                    <i class="fas fa-comment-dots"></i>
                    <h3>Aún no hay reseñas</h3>
                    <p>Sé el primero en compartir tu experiencia con este producto.</p>
                </div>
            `;
            return;
        }
        
        // Calcular estadísticas
        const totalReviews = this.reviews.length;
        const averageRating = this.calculateAverageRating();
        const ratingDistribution = this.calculateRatingDistribution();
        
        const statsHTML = `
            <div class="overall-rating">
                <div class="average-rating">${averageRating.toFixed(1)}</div>
                <div class="stars-large">
                    ${this.generateStarsHTML(averageRating, 5, true)}
                </div>
                <div class="total-reviews">${totalReviews} ${totalReviews === 1 ? 'reseña' : 'reseñas'}</div>
            </div>
            
            <div class="rating-bars">
                ${[5, 4, 3, 2, 1].map(rating => {
                    const count = ratingDistribution[rating] || 0;
                    const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                    
                    return `
                        <div class="rating-bar">
                            <div class="rating-label">
                                <span>${rating}</span>
                                <span class="rating-star">★</span>
                            </div>
                            <div class="bar-container">
                                <div class="bar-fill" style="width: ${percentage}%"></div>
                            </div>
                            <div class="rating-count">${count}</div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
        
        statsContainer.innerHTML = statsHTML;
    }
    
    calculateAverageRating() {
        if (this.reviews.length === 0) return 0;
        
        const totalRating = this.reviews.reduce((sum, review) => sum + review.calificacion, 0);
        return totalRating / this.reviews.length;
    }
    
    calculateRatingDistribution() {
        const distribution = {5: 0, 4: 0, 3: 0, 2: 0, 1: 0};
        
        this.reviews.forEach(review => {
            if (review.calificacion >= 1 && review.calificacion <= 5) {
                distribution[review.calificacion]++;
            }
        });
        
        return distribution;
    }
    
    generateStarsHTML(rating, maxRating = 5, large = false) {
        const fullStars = Math.floor(rating);
        const halfStar = rating % 1 >= 0.5;
        const emptyStars = maxRating - fullStars - (halfStar ? 1 : 0);
        
        let starsHTML = '';
        
        // Estrellas llenas
        for (let i = 0; i < fullStars; i++) {
            starsHTML += '★';
        }
        
        // Media estrella
        if (halfStar) {
            starsHTML += '★';
        }
        
        // Estrellas vacías
        for (let i = 0; i < emptyStars; i++) {
            starsHTML += '☆';
        }
        
        return starsHTML;
    }
    
    renderReviewsList() {
        const reviewsList = document.getElementById('reviews-list');
        if (!reviewsList) return;
        
        if (this.reviews.length === 0) {
            reviewsList.innerHTML = '';
            return;
        }
        
        // Paginar reseñas
        const startIndex = (this.currentPage - 1) * this.reviewsPerPage;
        const endIndex = startIndex + this.reviewsPerPage;
        const paginatedReviews = this.reviews.slice(startIndex, endIndex);
        
        const reviewsHTML = paginatedReviews.map(review => {
            const userInitials = this.getUserInitials(review.usuario_nombre);
            const formattedDate = this.formatDate(review.fecha_creacion);
            
            return `
                <div class="review-card">
                    <div class="review-header">
                        <div class="review-user">
                            <div class="user-avatar">${userInitials}</div>
                            <div class="user-info">
                                <h4>${review.usuario_nombre || 'Usuario'}</h4>
                                <div class="review-date">${formattedDate}</div>
                            </div>
                        </div>
                        <div class="review-rating">
                            ${this.generateStarsHTML(review.calificacion, 5)}
                        </div>
                    </div>
                    
                    ${review.titulo ? `<h5 class="review-title">${review.titulo}</h5>` : ''}
                    
                    <div class="review-content">
                        ${review.comentario}
                    </div>
                    
                    <div class="review-footer">
                        <div class="review-helpful">
                            <button class="helpful-btn" data-review-id="${review.id}">
                                <i class="fas fa-thumbs-up"></i> Útil
                            </button>
                            <span class="helpful-count">${review.util_count || 0} personas encontraron esto útil</span>
                        </div>
                        
                        ${review.respuestas && review.respuestas.length > 0 ? `
                            <div class="review-replies">
                                <i class="fas fa-reply"></i> ${review.respuestas.length} respuesta(s)
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
        
        reviewsList.innerHTML = reviewsHTML;
    }
    
    renderPagination() {
        const paginationContainer = document.getElementById('reviews-pagination');
        if (!paginationContainer || this.reviews.length <= this.reviewsPerPage) {
            if (paginationContainer) {
                paginationContainer.innerHTML = '';
            }
            return;
        }
        
        const totalPages = Math.ceil(this.reviews.length / this.reviewsPerPage);
        
        let paginationHTML = '';
        
        // Botón anterior
        if (this.currentPage > 1) {
            paginationHTML += `
                <button class="review-page-btn prev" data-page="${this.currentPage - 1}">
                    <i class="fas fa-chevron-left"></i>
                </button>
            `;
        }
        
        // Números de página
        const maxVisible = 5;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
        let endPage = Math.min(totalPages, startPage + maxVisible - 1);
        
        if (endPage - startPage + 1 < maxVisible) {
            startPage = Math.max(1, endPage - maxVisible + 1);
        }
        
        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <button class="review-page-btn ${i === this.currentPage ? 'active' : ''}" 
                        data-page="${i}">
                    ${i}
                </button>
            `;
        }
        
        // Botón siguiente
        if (this.currentPage < totalPages) {
            paginationHTML += `
                <button class="review-page-btn next" data-page="${this.currentPage + 1}">
                    <i class="fas fa-chevron-right"></i>
                </button>
            `;
        }
        
        paginationContainer.innerHTML = paginationHTML;
    }
    
    setupEventListeners() {
        // Botón para escribir reseña
        const writeReviewBtn = document.getElementById('write-review-btn');
        if (writeReviewBtn) {
            writeReviewBtn.addEventListener('click', () => this.openReviewModal());
        }
        
        // Modal
        const modal = document.getElementById('review-modal');
        const closeModalBtn = document.getElementById('close-modal');
        const cancelReviewBtn = document.getElementById('cancel-review');
        
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', () => this.closeReviewModal());
        }
        
        if (cancelReviewBtn) {
            cancelReviewBtn.addEventListener('click', () => this.closeReviewModal());
        }
        
        // Cerrar modal al hacer clic fuera
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeReviewModal();
                }
            });
        }
        
        // Selector de estrellas
        const starsSelector = document.getElementById('stars-selector');
        if (starsSelector) {
            starsSelector.addEventListener('click', (e) => {
                const star = e.target.closest('.star-selector');
                if (!star) return;
                
                const rating = parseInt(star.dataset.rating);
                this.selectRating(rating);
            });
        }
        
        // Formulario de reseña
        const reviewForm = document.getElementById('review-form');
        if (reviewForm) {
            reviewForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.submitReview();
            });
        }
        
        // Botones de paginación
        document.addEventListener('click', (e) => {
            const pageBtn = e.target.closest('.review-page-btn');
            if (pageBtn && pageBtn.dataset.page) {
                this.changePage(parseInt(pageBtn.dataset.page));
            }
        });
        
        // Botones de "útil"
        document.addEventListener('click', (e) => {
            const helpfulBtn = e.target.closest('.helpful-btn');
            if (helpfulBtn) {
                const reviewId = helpfulBtn.dataset.reviewId;
                this.markHelpful(reviewId);
            }
        });
    }
    
    openReviewModal() {
        const modal = document.getElementById('review-modal');
        const form = document.getElementById('review-form');
        
        if (modal && form) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            
            // Resetear formulario
            form.reset();
            this.currentUserRating = 0;
            this.resetStars();
        }
    }
    
    closeReviewModal() {
        const modal = document.getElementById('review-modal');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }
    
    selectRating(rating) {
        this.currentUserRating = rating;
        const stars = document.querySelectorAll('.star-selector');
        
        stars.forEach((star, index) => {
            if (index < rating) {
                star.classList.add('selected');
            } else {
                star.classList.remove('selected');
            }
        });
    }
    
    resetStars() {
        const stars = document.querySelectorAll('.star-selector');
        stars.forEach(star => star.classList.remove('selected'));
    }
    
    async submitReview() {
        const titleInput = document.getElementById('review-title');
        const commentInput = document.getElementById('review-comment');
        
        const title = titleInput.value.trim();
        const comment = commentInput.value.trim();
        
        // Validaciones
        if (this.currentUserRating === 0) {
            this.showNotification('Por favor selecciona una calificación', 'error');
            return;
        }
        
        if (!title || title.length < 3) {
            this.showNotification('El título debe tener al menos 3 caracteres', 'error');
            return;
        }
        
        if (!comment || comment.length < 10) {
            this.showNotification('La reseña debe tener al menos 10 caracteres', 'error');
            return;
        }
        
        // Verificar si el usuario está autenticado
        const sessionResponse = await fetch('/api/session');
        const sessionData = await sessionResponse.json();
        
        if (!sessionData.authenticated) {
            this.showNotification('Debes iniciar sesión para escribir una reseña', 'error');
            this.closeReviewModal();
            
            // Redirigir a login
            setTimeout(() => {
                window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
            }, 2000);
            return;
        }
        
        // Enviar reseña
        try {
            const response = await fetch(`/api/products/${this.productId}/reviews`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    calificacion: this.currentUserRating,
                    titulo: title,
                    comentario: comment
                })
            });
            
            if (response.ok) {
                this.showNotification('¡Gracias por tu reseña! Será publicada después de ser aprobada.', 'success');
                this.closeReviewModal();
                
                // Recargar reseñas
                await this.loadReviews();
                this.renderReviewsStats();
                this.renderReviewsList();
                this.renderPagination();
                
            } else {
                const errorData = await response.json();
                this.showNotification(errorData.error || 'Error al enviar la reseña', 'error');
            }
            
        } catch (error) {
            console.error('Error enviando reseña:', error);
            this.showNotification('Error de conexión. Intenta nuevamente.', 'error');
        }
    }
    
    changePage(page) {
        this.currentPage = page;
        this.renderReviewsList();
        this.renderPagination();
        
        // Scroll suave hacia las reseñas
        const reviewsSection = document.getElementById('product-reviews-section');
        if (reviewsSection) {
            reviewsSection.scrollIntoView({ behavior: 'smooth' });
        }
    }
    
    async markHelpful(reviewId) {
        try {
            const response = await fetch(`/api/reviews/${reviewId}/helpful`, {
                method: 'POST'
            });
            
            if (response.ok) {
                this.showNotification('¡Gracias por tu feedback!', 'success');
                
                // Actualizar contador localmente
                const helpfulBtn = document.querySelector(`.helpful-btn[data-review-id="${reviewId}"]`);
                const helpfulCount = helpfulBtn?.nextElementSibling;
                
                if (helpfulCount) {
                    const currentCount = parseInt(helpfulCount.textContent.match(/\d+/)?.[0] || 0);
                    helpfulCount.textContent = `${currentCount + 1} personas encontraron esto útil`;
                }
            }
            
        } catch (error) {
            console.error('Error marcando como útil:', error);
        }
    }
    
    getUserInitials(name) {
        if (!name) return 'U';
        
        const names = name.split(' ');
        if (names.length >= 2) {
            return (names[0][0] + names[1][0]).toUpperCase();
        }
        return names[0][0].toUpperCase();
    }
    
    formatDate(dateString) {
        const date = new Date(dateString);
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return date.toLocaleDateString('es-ES', options);
    }
    
    showNotification(message, type = 'info') {
        // Reutilizar función de notificación existente o crear una nueva
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background: ${type === 'success' ? '#d4edda' : 
                        type === 'error' ? '#f8d7da' : 
                        '#d1ecf1'};
            color: ${type === 'success' ? '#155724' : 
                    type === 'error' ? '#721c24' : 
                    '#0c5460'};
            border-left: 4px solid ${type === 'success' ? '#28a745' : 
                                type === 'error' ? '#dc3545' : 
                                '#17a2b8'};
            border-radius: 4px;
            z-index: 10001;
            animation: slideInRight 0.3s ease;
            max-width: 350px;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 4000);
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Verificar si estamos en la página de detalle de producto
    const productId = window.productDetailManager?.product?.id;
    
    if (productId) {
        // Hacer accesible globalmente
        window.reviewsManager = new ProductReviewsManager(productId);
        console.log('✅ Gestor de reseñas inicializado');
    }
});