// DOM Elements
const loginPage = document.getElementById('login-page');
const mainInterface = document.getElementById('main-interface');
const userRole = document.getElementById('user-role');
const calendar = document.getElementById('calendar');
const consultationForm = document.getElementById('consultation-form');

// Check authentication status on page load
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('/api/me', {
            credentials: 'include' // Important: include credentials in the request
        });
        if (response.ok) {
            const user = await response.json();
            if (user.role && user.role.trim().toLowerCase() === 'dieteticien') {
                showMainInterface(user);
            } else {
                alert('Rôle utilisateur non autorisé : ' + user.role);
                window.location.href = '/login.html';
            }
        } else {
            alert('Non authentifié (status ' + response.status + ')');
            window.location.href = '/login.html';
        }
    } catch (error) {
        alert('Erreur JS : ' + error);
        window.location.href = '/login.html';
    }

    // Déclarer logoutBtn ici !
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.onclick = async () => {
            try {
                await fetch('/api/logout', { 
                    method: 'POST',
                    credentials: 'include'
                });
                window.location.href = '/login.html';
            } catch (error) {
                alert('Erreur lors de la déconnexion !');
                console.error('Error during logout:', error);
                window.location.reload(); // Fallback
            }
        };
    } else {
        alert('logoutBtn introuvable !');
        console.log('logoutBtn introuvable !');
    }

    const showPatientListBtn = document.getElementById('show-patient-list');
    const hidePatientListBtn = document.getElementById('hide-patient-list');
    const searchResultsDiv = document.getElementById('search-results');
    if (showPatientListBtn && hidePatientListBtn && searchResultsDiv) {
        showPatientListBtn.addEventListener('click', () => {
            searchPatient(''); // Affiche tous les patients
            searchResultsDiv.style.display = 'block';
        });
        hidePatientListBtn.addEventListener('click', () => {
            searchResultsDiv.style.display = 'none';
            searchResultsDiv.innerHTML = '';
        });
    }

    // Catalogue alimentaire stylé avec images dynamiques
    const foodCatalog = [
        { name: 'Pomme', calories: 52, description: 'Riche en fibres et en vitamine C. Idéale pour une collation saine.' },
        { name: 'Banane', calories: 89, description: 'Source d\'énergie rapide, riche en potassium.' },
        { name: 'Carotte', calories: 41, description: 'Bonne pour la vue, riche en bêta-carotène.' },
        { name: 'Poulet grillé', calories: 165, description: 'Excellente source de protéines maigres.' },
        { name: 'Riz complet', calories: 111, description: 'Riche en fibres, idéal pour l\'énergie durable.' },
        { name: 'Brocoli', calories: 34, description: 'Très riche en vitamines et minéraux.' },
        { name: 'Saumon', calories: 208, description: 'Riche en oméga-3, excellent pour le cœur.' },
        { name: 'Amandes', calories: 579, description: 'Source de bons lipides et de protéines végétales.' },
        { name: 'Tomate', calories: 18, description: 'Faible en calories, riche en antioxydants.' },
        { name: 'Yaourt nature', calories: 61, description: 'Bonne source de calcium et de probiotiques.' }
    ];

    async function renderFoodCatalog() {
        const foodCatalogGrid = document.getElementById('food-catalog-grid');
        if (!foodCatalogGrid) return;
        foodCatalogGrid.innerHTML = '<div style="text-align:center;color:#888;font-size:1.1rem;">Chargement du catalogue...</div>';
        const cards = await Promise.all(foodCatalog.map(async food => {
            const img = await fetchFoodImage(food.name);
            return `
                <div class="catalog-item food-card-anim" style="border:2.5px solid #5a8dee;border-radius:18px;padding:1.5rem;background:linear-gradient(135deg,#f8f9fa 60%,#eaf1ff 100%);box-shadow:0 4px 18px rgba(90,141,238,0.10);transition:box-shadow 0.25s,transform 0.18s;cursor:pointer;min-width:220px;max-width:260px;display:flex;flex-direction:column;align-items:center;gap:0.5rem;">
                    <img src="${img}" alt="${food.name}" style="width:90px;height:90px;object-fit:cover;border-radius:14px;margin-bottom:0.7rem;border:2.5px solid #4cd185;background:#fff;box-shadow:0 2px 8px #4cd18522;transition:transform 0.2s;">
                    <h4 style="color:#5a8dee;font-size:1.15rem;margin-bottom:0.3rem;font-weight:700;letter-spacing:0.5px;">${food.name}</h4>
                    <p style="color:#4cd185;font-weight:700;margin-bottom:0.2rem;font-size:1.05rem;">${food.calories} kcal / 100g</p>
                    <p style="color:#343a40;font-size:0.98rem;">${food.description}</p>
                </div>
            `;
        }));
        foodCatalogGrid.innerHTML = cards.join('');
        // Animation au survol
        document.querySelectorAll('.food-card-anim').forEach(card => {
            card.addEventListener('mouseenter', () => {
                card.style.transform = 'translateY(-7px) scale(1.04)';
                card.style.boxShadow = '0 8px 32px #5a8dee33';
            });
            card.addEventListener('mouseleave', () => {
                card.style.transform = '';
                card.style.boxShadow = '0 4px 18px rgba(90,141,238,0.10)';
            });
        });
    }

    // Appel au chargement
    renderFoodCatalog();
});

function showMainInterface(user) {
    if (userRole) {
        userRole.textContent = `Connecté en tant que ${user.role}`;
    }
    if (calendar) {
        initializeCalendar();
    }
    loadTodayAppointments();
    loadStatistics();
}

// Initialize Calendar
function initializeCalendar() {
    $(calendar).fullCalendar({
        header: {
            left: 'prev,next today',
            center: 'title',
            right: 'month,agendaWeek,agendaDay'
        },
        selectable: true,
        select: function(start, end) {
            showTimeSlots(start.format('YYYY-MM-DD'));
        },
        eventRender: function(event, element) {
            if (event.status === 'cancelled') {
                element.css('background-color', '#e74c3c');
            }
        }
    });
}

// Patient Management
async function searchPatient(searchTerm = null) {
    if (searchTerm === null) {
        const input = document.getElementById('patient-search');
        searchTerm = input ? input.value : '';
    }
    try {
        const response = await fetch(`/api/patients?search=${searchTerm}`);
        const patients = await response.json();
        displayPatients(patients);
    } catch (error) {
        console.error('Error searching patients:', error);
        showNotification('Erreur lors de la recherche des patients', 'error');
    }
}

function displayPatients(patients) {
    const resultsDiv = document.getElementById('search-results');
    resultsDiv.classList.add('patient-list-vertical');
    if (!patients || patients.length === 0) {
        resultsDiv.innerHTML = '<div style="text-align:center;color:#888;font-size:1.1rem;padding:20px;">Aucun patient trouvé.</div>';
        return;
    }
    resultsDiv.innerHTML = patients.map(patient => `
        <div class="patient-card">
            <h3>${patient.first_name} ${patient.last_name}</h3>
            <p><i class="fas fa-phone"></i> ${patient.phone || 'Non renseigné'}</p>
            <p><i class="fas fa-envelope"></i> ${patient.email || 'Non renseigné'}</p>
            <p><i class="fas fa-map-marker-alt"></i> ${patient.address || 'Non renseignée'}</p>
            <div class="action-buttons">
                <button class="edit-btn" onclick="openEditModal(${patient.id})">
                    <i class="fas fa-edit"></i> Modifier
                </button>
                <button class="archive-btn" onclick="archivePatient(${patient.id})">
                    <i class="fas fa-archive"></i> Archiver
                </button>
            </div>
        </div>
    `).join('');
}

// Appointment Management
async function showTimeSlots(date) {
    try {
        const response = await fetch(`/api/appointments?date=${date}&dieticianId=${getCurrentUserId()}`);
        const appointments = await response.json();
        
        // Generate time slots (9:00 to 17:00)
        const slots = [];
        for (let hour = 9; hour < 17; hour++) {
            for (let minute = 0; minute < 60; minute += 30) {
                const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                const isBooked = appointments.some(apt => apt.time === time);
                slots.push({ time, isBooked });
            }
        }

        displayTimeSlots(slots, date);
    } catch (error) {
        console.error('Error fetching time slots:', error);
        showNotification('Erreur lors de la récupération des créneaux', 'error');
    }
}

function displayTimeSlots(slots, date) {
    timeSlots.innerHTML = slots.map(slot => `
        <div class="time-slot${slot.isBooked ? ' unavailable' : ''}">
            ${slot.time} ${slot.isBooked ? '(Réservé)' : ''}
        </div>
    `).join('');
}

// Ajout de la fonction pour corriger l'erreur ReferenceError
async function loadTodayAppointments() {
    // Récupère les rendez-vous du jour pour ce diététicien (affichage à compléter selon besoin)
    try {
        const today = new Date().toISOString().split('T')[0];
        // On suppose que l'utilisateur connecté est diététicien
        const response = await fetch(`/api/appointments?date=${today}`);
        if (!response.ok) throw new Error('Erreur lors du chargement des rendez-vous du jour');
        const appointments = await response.json();
        // Tu peux ici afficher les rendez-vous dans le DOM si besoin
        console.log('Rendez-vous du jour:', appointments);
    } catch (error) {
        console.error('Erreur chargement rendez-vous du jour:', error);
    }
}

// Ajout de la fonction pour corriger l'erreur ReferenceError
async function loadStatistics() {
    // Récupère les statistiques pour le diététicien (affichage à compléter selon besoin)
    try {
        const response = await fetch('/api/statistics');
        if (!response.ok) throw new Error('Erreur lors du chargement des statistiques');
        const stats = await response.json();
        // Tu peux ici afficher les statistiques dans le DOM si besoin
        console.log('Statistiques:', stats);
    } catch (error) {
        console.error('Erreur chargement statistiques:', error);
    }
}

// Fonction pour récupérer une image depuis l'API Pixabay
async function fetchFoodImage(query) {
    const apiKey = '38201516-2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e'; // Pixabay demo key, à remplacer par une vraie clé si besoin
    const url = `https://pixabay.com/api/?key=${apiKey}&q=${encodeURIComponent(query)}&image_type=photo&per_page=3&category=food`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.hits && data.hits.length > 0) {
            return data.hits[0].webformatURL;
        }
    } catch (e) {}
    return 'https://cdn.pixabay.com/photo/2017/01/20/15/06/apple-1995056_1280.jpg'; // fallback
}