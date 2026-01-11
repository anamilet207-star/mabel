// ============================================
// FOOTER - Componente dinámico
// ============================================

class MabelFooter extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        this.render();
        this.setupEventListeners();
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    width: 100%;
                    background: #000;
                    color: white;
                    font-family: 'Helvetica Neue', Arial, sans-serif;
                }
                
                .footer-container {
                    max-width: 1400px;
                    margin: 0 auto;
                    padding: 60px 40px 30px;
                }
                
                .footer-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                    gap: 40px;
                    margin-bottom: 50px;
                }
                
                .footer-section h3 {
                    font-size: 16px;
                    font-weight: 600;
                    letter-spacing: 2px;
                    text-transform: uppercase;
                    margin-bottom: 25px;
                    color: #fff;
                }
                
                .footer-about p {
                    color: #999;
                    font-size: 14px;
                    line-height: 1.6;
                    margin-bottom: 20px;
                    max-width: 300px;
                }
                
                .footer-links {
                    list-style: none;
                    padding: 0;
                }
                
                .footer-links li {
                    margin-bottom: 12px;
                }
                
                .footer-links a {
                    color: #999;
                    text-decoration: none;
                    font-size: 14px;
                    transition: color 0.3s;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                
                .footer-links a:hover {
                    color: #fff;
                }
                
                .footer-links i {
                    width: 20px;
                    text-align: center;
                    font-size: 16px;
                }
                
                .social-links {
                    display: flex;
                    gap: 15px;
                    margin-top: 20px;
                }
                
                .social-link {
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    background: rgba(255,255,255,0.1);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    text-decoration: none;
                    transition: background 0.3s;
                }
                
                .social-link:hover {
                    background: rgba(255,255,255,0.2);
                }
                
                .footer-bottom {
                    border-top: 1px solid rgba(255,255,255,0.1);
                    padding-top: 30px;
                    text-align: center;
                }
                
                .copyright {
                    color: #999;
                    font-size: 12px;
                    letter-spacing: 1px;
                    text-transform: uppercase;
                    margin-bottom: 20px;
                }
                
                .payment-methods {
                    display: flex;
                    justify-content: center;
                    gap: 20px;
                    font-size: 24px;
                    color: #999;
                    margin-bottom: 30px;
                }
                
                .footer-legal {
                    display: flex;
                    justify-content: center;
                    gap: 30px;
                    margin-top: 20px;
                }
                
                .footer-legal a {
                    color: #999;
                    text-decoration: none;
                    font-size: 12px;
                    letter-spacing: 1px;
                }
                
                .footer-legal a:hover {
                    color: white;
                }
                
                .newsletter-form {
                    margin-top: 20px;
                    display: flex;
                    gap: 10px;
                }
                
                .newsletter-input {
                    flex: 1;
                    padding: 12px 15px;
                    border: 1px solid rgba(255,255,255,0.2);
                    background: transparent;
                    color: white;
                    font-size: 14px;
                    border-radius: 4px;
                }
                
                .newsletter-input::placeholder {
                    color: #999;
                }
                
                .newsletter-btn {
                    background: white;
                    color: black;
                    border: none;
                    padding: 12px 25px;
                    font-size: 12px;
                    font-weight: 600;
                    letter-spacing: 1px;
                    text-transform: uppercase;
                    cursor: pointer;
                    border-radius: 4px;
                    transition: opacity 0.3s;
                }
                
                .newsletter-btn:hover {
                    opacity: 0.9;
                }
                
                @media (max-width: 768px) {
                    .footer-container {
                        padding: 40px 20px 20px;
                    }
                    
                    .footer-grid {
                        grid-template-columns: 1fr;
                        gap: 30px;
                    }
                    
                    .newsletter-form {
                        flex-direction: column;
                    }
                    
                    .footer-legal {
                        flex-direction: column;
                        align-items: center;
                        gap: 15px;
                    }
                }
            </style>
            
            <footer>
                <div class="footer-container">
                    <div class="footer-grid">
                        <!-- Información -->
                        <div class="footer-section footer-about">
                            <h3>MABEL ACTIVEWEAR</h3>
                            <p>
                                Ropa deportiva femenina de alta calidad. Diseñada para mujeres 
                                activas que valoran el estilo, el rendimiento y la comodidad.
                            </p>
                            <div class="social-links">
                                <a href="#" class="social-link" aria-label="Instagram">
                                    <i class="fab fa-instagram"></i>
                                </a>
                                <a href="#" class="social-link" aria-label="Facebook">
                                    <i class="fab fa-facebook-f"></i>
                                </a>
                                <a href="#" class="social-link" aria-label="TikTok">
                                    <i class="fab fa-tiktok"></i>
                                </a>
                                <a href="#" class="social-link" aria-label="Pinterest">
                                    <i class="fab fa-pinterest-p"></i>
                                </a>
                            </div>
                        </div>
                        
                        <!-- Enlaces Rápidos -->
                        <div class="footer-section">
                            <h3>Enlaces Rápidos</h3>
                            <ul class="footer-links">
                                <li><a href="/shop">Tienda</a></li>
                                <li><a href="/shop?category=leggings">Leggings</a></li>
                                <li><a href="/shop?category=tops">Tops</a></li>
                                <li><a href="/shop?category=sets">Sets</a></li>
                                <li><a href="/ofertas">Ofertas</a></li>
                                <li><a href="/tallas">Guía de Tallas</a></li>
                            </ul>
                        </div>
                        
                        <!-- Ayuda -->
                        <div class="footer-section">
                            <h3>Ayuda</h3>
                            <ul class="footer-links">
                                <li><a href="/contacto">Contacto</a></li>
                                <li><a href="/envios">Envíos</a></li>
                                <li><a href="/devoluciones">Devoluciones</a></li>
                                <li><a href="/preguntas-frecuentes">Preguntas Frecuentes</a></li>
                                <li><a href="/politica-privacidad">Política de Privacidad</a></li>
                            </ul>
                        </div>
                        
                        <!-- Contacto y Newsletter -->
                        <div class="footer-section">
                            <h3>Contacto</h3>
                            <ul class="footer-links">
                                <li>
                                    <i class="fas fa-envelope"></i>
                                    <a href="mailto:info@mabelactivewear.com">info@mabelactivewear.com</a>
                                </li>
                                <li>
                                    <i class="fas fa-phone"></i>
                                    <a href="tel:+15551234567">+1 (555) 123-4567</a>
                                </li>
                                <li>
                                    <i class="fas fa-map-marker-alt"></i>
                                    <span>Lun-Vie: 9:00-18:00</span>
                                </li>
                            </ul>
                            
                            <form class="newsletter-form" id="newsletterForm">
                                <input type="email" class="newsletter-input" 
                                       placeholder="Tu correo" required>
                                <button type="submit" class="newsletter-btn">Suscribirse</button>
                            </form>
                        </div>
                    </div>
                    
                    <div class="footer-bottom">
                        <div class="payment-methods">
                            <i class="fab fa-cc-visa"></i>
                            <i class="fab fa-cc-mastercard"></i>
                            <i class="fab fa-cc-amex"></i>
                            <i class="fab fa-cc-paypal"></i>
                        </div>
                        
                        <div class="copyright">
                            &copy; 2024 MABEL ACTIVEWEAR. TODOS LOS DERECHOS RESERVADOS.
                        </div>
                        
                        <div class="footer-legal">
                            <a href="/terminos-condiciones">Términos y Condiciones</a>
                            <a href="/politica-privacidad">Política de Privacidad</a>
                            <a href="/politica-cookies">Política de Cookies</a>
                        </div>
                    </div>
                </div>
            </footer>
        `;
    }

    setupEventListeners() {
        // Newsletter
        const newsletterForm = this.shadowRoot.getElementById('newsletterForm');
        if (newsletterForm) {
            newsletterForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const email = e.target.querySelector('.newsletter-input').value;
                
                // Simular envío
                const button = e.target.querySelector('.newsletter-btn');
                const originalText = button.textContent;
                button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                button.disabled = true;
                
                setTimeout(() => {
                    alert('¡Gracias por suscribirte a nuestro newsletter!');
                    e.target.reset();
                    button.textContent = originalText;
                    button.disabled = false;
                }, 1500);
            });
        }
    }
}

// Definir custom element
customElements.define('mabel-footer', MabelFooter);