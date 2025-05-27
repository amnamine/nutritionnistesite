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
    const showArchivedBtn = document.getElementById('show-archived-patients');
    const searchResultsDiv = document.getElementById('search-results');
    if (showPatientListBtn && hidePatientListBtn && searchResultsDiv) {
        showPatientListBtn.addEventListener('click', () => {
            // Affiche uniquement les patients non archivés (status !== 'archived')
            fetch('/api/patients?includeArchived=true')
                .then(res => res.json())
                .then(patients => {
                    const actifs = patients.filter(p => p.status !== 'archived');
                    displayPatients(actifs);
                    searchResultsDiv.style.display = 'block';
                });
        });
        hidePatientListBtn.addEventListener('click', () => {
            searchResultsDiv.style.display = 'none';
            searchResultsDiv.innerHTML = '';
        });
    }
    if (showArchivedBtn && searchResultsDiv) {
        showArchivedBtn.addEventListener('click', () => {
            fetch('/api/patients?includeArchived=true')
                .then(res => res.json())
                .then(patients => {
                    const archived = patients.filter(p => p.status === 'archived');
                    displayPatients(archived);
                    searchResultsDiv.style.display = 'block';
                });
        });
    }

    // Catalogue alimentaire stylé avec images dynamiques
    const foodCatalog = [
        { name: 'Pomme', calories: 52, description: 'Riche en fibres et en vitamine C. Idéale pour une collation saine.', image: 'pomme.jpg' },
        { name: 'Banane', calories: 89, description: 'Source d\'énergie rapide, riche en potassium.', image: 'banane.jpg' },
        { name: 'Carotte', calories: 41, description: 'Bonne pour la vue, riche en bêta-carotène.', image: 'carotte.jpg' },
        { name: 'Poulet', calories: 165, description: 'Excellente source de protéines maigres.', image: 'poulet.jpg' },
        { name: 'Riz', calories: 111, description: 'Riche en fibres, idéal pour l\'énergie durable.', image: 'riz.jpg' },
        { name: 'Brocoli', calories: 34, description: 'Très riche en vitamines et minéraux.', image: 'brocoli.jpg' },
        { name: 'Saumon', calories: 208, description: 'Riche en oméga-3, excellent pour le cœur.', image: 'saumon.jpg' },
        { name: 'Amandes', calories: 579, description: 'Source de bons lipides et de protéines végétales.', image: 'amandes.jpg' },
        { name: 'Tomate', calories: 18, description: 'Faible en calories, riche en antioxydants.', image: 'tomate.jpg' },
        { name: 'Yaourt', calories: 61, description: 'Bonne source de calcium et de probiotiques.', image: 'yaourt.jpg' }
    ];

    async function renderFoodCatalog() {
        const foodCatalogGrid = document.getElementById('food-catalog-grid');
        if (!foodCatalogGrid) return;
        foodCatalogGrid.innerHTML = '<div style="text-align:center;color:#888;font-size:1.1rem;">Chargement du catalogue...</div>';
        const cards = foodCatalog.map(food => {
            return `
                <div class="catalog-item food-card-anim" style="border:2.5px solid #5a8dee;border-radius:18px;padding:1.5rem;background:linear-gradient(135deg,#f8f9fa 60%,#eaf1ff 100%);box-shadow:0 4px 18px rgba(90,141,238,0.10);transition:box-shadow 0.25s,transform 0.18s;cursor:pointer;min-width:220px;max-width:260px;display:flex;flex-direction:column;align-items:center;gap:0.5rem;">
                    <img src="/images/${food.image}" alt="${food.name}" style="width:90px;height:90px;object-fit:cover;border-radius:14px;margin-bottom:0.7rem;border:2.5px solid #4cd185;background:#fff;box-shadow:0 2px 8px #4cd18522;transition:transform 0.2s;">
                    <h4 style="color:#5a8dee;font-size:1.15rem;margin-bottom:0.3rem;font-weight:700;letter-spacing:0.5px;">${food.name}</h4>
                    <p style="color:#4cd185;font-weight:700;margin-bottom:0.2rem;font-size:1.05rem;">${food.calories} kcal / 100g</p>
                    <p style="color:#343a40;font-size:0.98rem;">${food.description}</p>
                </div>
            `;
        });
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

    const toggleAddPatientBtn = document.getElementById('toggle-add-patient-form');
    const patientForm = document.getElementById('patient-form');
    if (toggleAddPatientBtn && patientForm) {
        toggleAddPatientBtn.addEventListener('click', () => {
            if (patientForm.style.display === 'none' || patientForm.style.display === '') {
                patientForm.style.display = 'block';
            } else {
                patientForm.style.display = 'none';
            }
        });
    }

    loadPatientCounters();

    // Formulaire de consultation : calcul automatique de l'IMC
    const poidsInput = document.getElementById('consult-poids');
    const tailleInput = document.getElementById('consult-taille');
    const imcInput = document.getElementById('consult-imc');

    function updateIMC() {
        const poids = parseFloat(poidsInput.value);
        const tailleCm = parseFloat(tailleInput.value);
        if (!isNaN(poids) && !isNaN(tailleCm) && tailleCm > 0) {
            const tailleM = tailleCm / 100;
            const imc = poids / (tailleM * tailleM);
            imcInput.value = imc.toFixed(2);
        } else {
            imcInput.value = '';
        }
    }
    if (poidsInput && tailleInput && imcInput) {
        poidsInput.addEventListener('input', updateIMC);
        tailleInput.addEventListener('input', updateIMC);
    }

    // Remplir dynamiquement la liste des patients dans le select du formulaire de consultation
    const consultPatientSelect = document.getElementById('consult-patient');
    if (consultPatientSelect) {
        fetch('/api/patients?includeArchived=false')
            .then(res => res.json())
            .then(patients => {
                patients.forEach(p => {
                    const opt = document.createElement('option');
                    opt.value = p.id;
                    opt.textContent = `${p.first_name} ${p.last_name}`;
                    consultPatientSelect.appendChild(opt);
                });
            });
    }

    // Gestion de la soumission du formulaire de consultation
    const consultForm = document.getElementById('consultation-data-form');
    if (consultForm) {
        consultForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const data = {
                patient_id: document.getElementById('consult-patient').value,
                pa_plus: document.getElementById('consult-pa-plus').value,
                pb_plus: document.getElementById('consult-pb-plus').value,
                imc: document.getElementById('consult-imc').value,
                weight: document.getElementById('consult-poids').value,
                height: document.getElementById('consult-taille').value,
                tour_taille: document.getElementById('consult-tour-taille').value,
                nom: document.getElementById('consult-nom').value,
                prenom: document.getElementById('consult-prenom').value
            };
            try {
                const response = await fetch('/api/consultations', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(data)
                });
                if (response.ok) {
                    showNotification('Consultation enregistrée avec succès !', 'success');
                    consultForm.reset();
                    imcInput.value = '';
                } else {
                    const err = await response.json();
                    showNotification('Erreur lors de l\'enregistrement : ' + (err.error || response.status), 'error');
                }
            } catch (err) {
                showNotification('Erreur lors de l\'enregistrement', 'error');
            }
        });
    }

    // Affichage/masquage du formulaire de consultation
    const toggleConsultBtn = document.getElementById('toggle-consult-form');
    const consultFormDiv = document.getElementById('consultation-form');
    if (toggleConsultBtn && consultFormDiv) {
        toggleConsultBtn.addEventListener('click', () => {
            if (consultFormDiv.style.display === 'none' || consultFormDiv.style.display === '') {
                consultFormDiv.style.display = 'block';
            } else {
                consultFormDiv.style.display = 'none';
            }
        });
    }

    // Affichage/masquage de la section des consultations + chargement dynamique
    const toggleAllConsultsBtn = document.getElementById('toggle-all-consults');
    const allConsultsSection = document.getElementById('all-consults-section');
    const allConsultsList = document.getElementById('all-consults-list');
    let consultsLoaded = false;
    if (toggleAllConsultsBtn && allConsultsSection && allConsultsList) {
        toggleAllConsultsBtn.addEventListener('click', async () => {
            if (allConsultsSection.style.display === 'none' || allConsultsSection.style.display === '') {
                allConsultsSection.style.display = 'block';
                try {
                    allConsultsList.innerHTML = '<div style="color:#888;">Chargement...</div>';
                    
                    const res = await fetch('/api/consultations', { 
                        method: 'GET',
                        credentials: 'include',
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json'
                        }
                    });
                    
                    if (!res.ok) {
                        const errorData = await res.json().catch(() => ({}));
                        throw new Error(`Erreur HTTP: ${res.status} ${res.statusText} - ${errorData.error || ''}`);
                    }
                    
                    const consults = await res.json();
                    
                    if (Array.isArray(consults) && consults.length > 0) {
                        allConsultsList.innerHTML = consults.map(c => `
                            <div class="consultation-history-item" style="background: #fff; padding: 1rem; margin-bottom: 1rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                                <div class="consultation-date" style="color: #5a8dee; font-weight: bold; margin-bottom: 0.5rem;">
                                    <i class="fas fa-calendar-alt"></i> ${c.date ? new Date(c.date).toLocaleDateString('fr-FR') : 'Date non spécifiée'}
                                </div>
                                <div class="consultation-data" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.5rem;">
                                    <p><strong>Patient :</strong> ${c.first_name || ''} ${c.last_name || ''}</p>
                                    <p><strong>Poids :</strong> ${c.weight || 'Non renseigné'} kg</p>
                                    <p><strong>Taille :</strong> ${c.height || 'Non renseigné'} cm</p>
                                    <p><strong>IMC :</strong> ${c.imc || 'Non calculé'}</p>
                                    <p><strong>PA+ :</strong> ${c.pa_plus || 'Non renseigné'}</p>
                                    <p><strong>PB+ :</strong> ${c.pb_plus || 'Non renseigné'}</p>
                                    <p><strong>Tour de taille :</strong> ${c.tour_taille || 'Non renseigné'} cm</p>
                                    <p><strong>Compte rendu :</strong> ${c.compte_rendu || 'Non renseigné'}</p>
                                </div>
                            </div>
                        `).join('');
                    } else {
                        allConsultsList.innerHTML = '<div style="text-align: center; color: #666; padding: 2rem;">Aucune consultation à afficher.</div>';
                    }
                } catch (e) {
                    allConsultsList.innerHTML = `
                        <div style="color: #e74c3c; text-align: center; padding: 2rem; background: #fdf3f2; border-radius: 8px; margin: 1rem 0;">
                            <i class="fas fa-exclamation-circle" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                            <p>Erreur lors du chargement des consultations.</p>
                            <p style="font-size: 0.9rem; color: #666;">Détails: ${e.message}</p>
                        </div>`;
                }
            } else {
                allConsultsSection.style.display = 'none';
            }
        });
    }
});

function showMainInterface(user) {
    if (userRole) {
        userRole.textContent = `Connecté en tant que ${user.role}`;
    }
    if (calendar) {
        initializeCalendar();
    }
    // Désactive temporairement les stats pour éviter l'erreur 403
    // try { loadStatistics(); } catch(e) {}
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

// Notification simple
function showNotification(message, type = 'success') {
    let notif = document.getElementById('notif-message');
    if (!notif) {
        notif = document.createElement('div');
        notif.id = 'notif-message';
        notif.style.position = 'fixed';
        notif.style.top = '20px';
        notif.style.left = '50%';
        notif.style.transform = 'translateX(-50%)';
        notif.style.zIndex = '9999';
        notif.style.padding = '1rem 2rem';
        notif.style.borderRadius = '8px';
        notif.style.fontWeight = 'bold';
        notif.style.fontSize = '1.1rem';
        notif.style.boxShadow = '0 2px 8px #0002';
        document.body.appendChild(notif);
    }
    notif.textContent = message;
    notif.style.background = type === 'success' ? '#4caf50' : '#e74c3c';
    notif.style.color = 'white';
    notif.style.display = 'block';
    setTimeout(() => { notif.style.display = 'none'; }, 2500);
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
                <button class="edit-btn" data-id="${patient.id}">
                    <i class="fas fa-edit"></i> Modifier
                </button>
                <button class="archive-btn" data-id="${patient.id}">
                    <i class="fas fa-archive"></i> Archiver
                </button>
            </div>
        </div>
    `).join('');
    // Ajout des listeners après rendu
    resultsDiv.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = btn.getAttribute('data-id');
            console.log('Modifier patient id:', id);
            if (typeof openEditModal === 'function') {
                openEditModal(id);
            } else {
                alert('La fonction de modification n\'est pas encore disponible.');
            }
        });
    });
    resultsDiv.querySelectorAll('.archive-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = btn.getAttribute('data-id');
            console.log('Archiver patient id:', id);
            archivePatient(id);
        });
    });
}

async function archivePatient(id) {
    try {
        console.log('Envoi requête archivage pour patient', id);
        // 1. Récupérer le patient
        const getRes = await fetch(`/api/patients?includeArchived=true`);
        const allPatients = await getRes.json();
        const patient = allPatients.find(p => p.id == id);
        if (!patient) {
            showNotification('Patient introuvable', 'error');
            return;
        }
        // 2. Envoyer tous les champs avec status: 'archived'
        const payload = {
            first_name: patient.first_name,
            last_name: patient.last_name,
            phone: patient.phone,
            email: patient.email,
            address: patient.address,
            status: 'archived'
        };
        console.log('Payload archivage:', payload);
        const response = await fetch(`/api/patients/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (response.ok) {
            showNotification('Patient archivé avec succès', 'success');
            // Recharge la liste des patients actifs
            fetch('/api/patients?includeArchived=true')
                .then(res => res.json())
                .then(patients => {
                    const actifs = patients.filter(p => p.status !== 'archived');
                    displayPatients(actifs);
                });
        } else {
            showNotification('Erreur lors de l\'archivage', 'error');
        }
    } catch (error) {
        showNotification('Erreur lors de l\'archivage', 'error');
        console.error('Erreur archivage patient:', error);
    }
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
    try {
        const today = new Date().toISOString().split('T')[0];
        const response = await fetch(`/api/appointments?date=${today}`);
        if (!response.ok) throw new Error('Erreur lors du chargement des rendez-vous du jour');
        const appointments = await response.json();
        const todayAppointmentsElem = document.getElementById('today-appointments');
        if (todayAppointmentsElem) todayAppointmentsElem.textContent = appointments.length;
    } catch (error) {
        console.error('Erreur chargement rendez-vous du jour:', error);
        const todayAppointmentsElem = document.getElementById('today-appointments');
        if (todayAppointmentsElem) todayAppointmentsElem.textContent = '0';
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

async function loadPatientCounters() {
    try {
        const response = await fetch('/api/patients?includeArchived=true');
        if (!response.ok) throw new Error('Erreur lors du chargement des patients');
        const patients = await response.json();
        let active = 0, archived = 0;
        patients.forEach(p => {
            if (p.status === 'archived') archived++;
            else active++;
        });
        const activeElem = document.getElementById('active-patients');
        const archivedElem = document.getElementById('archived-patients');
        if (activeElem) activeElem.textContent = active;
        if (archivedElem) archivedElem.textContent = archived;
    } catch (error) {
        console.error('Erreur chargement patients:', error);
        const activeElem = document.getElementById('active-patients');
        const archivedElem = document.getElementById('archived-patients');
        if (activeElem) activeElem.textContent = '0';
        if (archivedElem) archivedElem.textContent = '0';
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