// DOM Elements
const loginPage = document.getElementById('login-page');
const mainInterface = document.getElementById('main-interface');
const userRole = document.getElementById('user-role');
const logoutBtn = document.getElementById('logout-btn');
const calendar = document.getElementById('calendar');
const timeSlots = document.getElementById('time-slots');
const patientForm = document.getElementById('patient-form');
const showAddPatientBtn = document.getElementById('show-add-patient');
const dieticianSelect = document.getElementById('dietician-select');
const patientModal = document.getElementById('patient-modal');
const closeModal = document.querySelector('.close');
const togglePatientListBtn = document.getElementById('toggle-patient-list');
const searchResultsDiv = document.getElementById('search-results');
const showPatientListBtn = document.getElementById('show-patient-list');
const hidePatientListBtn = document.getElementById('hide-patient-list');

// Variable globale pour l'état d'affichage de la liste des patients
window.patientListVisible = false;

// Check authentication status on page load
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('/api/me', {
            credentials: 'include'
        });
        if (response.ok) {
            const user = await response.json();
            console.log('Current user:', user);
            if (user.role === 'reception') {
                showMainInterface(user);
                loadDieticians();
            } else {
                console.warn('Rôle utilisateur non autorisé:', user.role);
                window.location.href = '/login.html';
            }
        } else {
            console.warn('Non authentifié, redirection vers login');
            window.location.href = '/login.html';
        }
    } catch (error) {
        console.error('Error checking auth status:', error);
        window.location.href = '/login.html';
    }

    // Bouton pour afficher/cacher la liste des patients (doit être dans le DOMContentLoaded)
    if (showPatientListBtn && hidePatientListBtn && searchResultsDiv) {
        showPatientListBtn.addEventListener('click', () => {
            if (!window.patientListVisible) {
                window.patientListVisible = true;
                searchResultsDiv.style.display = 'block';
                searchPatient();
            }
        });
        hidePatientListBtn.addEventListener('click', () => {
            window.patientListVisible = false;
            searchResultsDiv.style.display = 'none';
            searchResultsDiv.innerHTML = '';
        });
    }

    // Charger dynamiquement la liste des diététiciens
    if (dieticianSelect) {
        try {
            const response = await fetch('/api/users?role=dieteticien');
            const dieticians = await response.json();
            dieticianSelect.innerHTML = '<option value="">-- Sélectionner un diététicien --</option>' +
                dieticians.map(d => `<option value="${d.id}">${d.username}</option>`).join('');
        } catch (error) {
            dieticianSelect.innerHTML = '<option value="">Erreur chargement diététiciens</option>';
        }
    }

    // Rendre la sélection du diététicien obligatoire avant de pouvoir choisir une date et continuer
    const continueDateBtn = document.getElementById('continue-date-btn');
    if (dieticianSelect && continueDateBtn) {
        dieticianSelect.addEventListener('change', () => {
            // Désactiver le calendrier tant qu'aucun diététicien n'est sélectionné
            if (!dieticianSelect.value) {
                continueDateBtn.disabled = true;
                window.selectedAppointmentDate = null;
                if (document.getElementById('display-selected-date')) {
                    document.getElementById('display-selected-date').textContent = 'Aucune date sélectionnée';
                }
            }
        });
    }

    // Initialisation du calendrier FullCalendar v5+
    if (calendar) {
        const displaySelectedDate = document.getElementById('display-selected-date');
        window.selectedAppointmentDate = null;
        const calendarObj = new FullCalendar.Calendar(calendar, {
            locale: 'fr',
            initialView: 'dayGridMonth',
            selectable: true,
            select: function(info) {
                // On ne permet la sélection de date que si un diététicien est choisi
                if (!dieticianSelect || !dieticianSelect.value) {
                    showNotification('Veuillez d\'abord sélectionner un diététicien', 'error');
                    return;
                }
                const dateStr = info.startStr;
                window.selectedAppointmentDate = dateStr;
                if (displaySelectedDate) displaySelectedDate.textContent = moment(dateStr).format('dddd D MMMM YYYY');
                if (continueDateBtn) continueDateBtn.disabled = false;
            }
        });
        calendarObj.render();
    }

    // Nouvelle logique pour le menu déroulant d'horaire
    const timeSlotSelect = document.getElementById('time-slot-select');
    const continueTimeBtn = document.getElementById('continue-time-btn');
    if (timeSlotSelect && continueTimeBtn) {
        timeSlotSelect.addEventListener('change', () => {
            window.selectedAppointmentTime = timeSlotSelect.value;
            continueTimeBtn.disabled = !window.selectedAppointmentTime;
        });
    }

    // Correction : supprimer les onclick HTML sur les boutons de l'étape 4 pour éviter tout conflit
    const confirmBtn = document.querySelector('#step4 .btn-validate');
    const backBtn = document.querySelector('#step4 .btn-back');
    if (confirmBtn) confirmBtn.removeAttribute('onclick');
    if (backBtn) backBtn.removeAttribute('onclick');

    if (confirmBtn) {
        confirmBtn.onclick = async (e) => {
            e.preventDefault();
            await confirmAppointment();
        };
    }
    if (backBtn) {
        backBtn.onclick = (e) => {
            e.preventDefault();
            document.getElementById('step4').classList.remove('active');
            document.getElementById('step3').classList.add('active');
            document.getElementById('progress-step4').classList.remove('active');
            document.getElementById('progress-step3').classList.remove('completed');
        };
    }

    // Gestion de l'affichage/masquage de la liste des rendez-vous
    const toggleAppointmentsBtn = document.getElementById('toggle-appointments-list');
    const appointmentsSection = document.getElementById('appointments-list-section');
    const appointmentsList = document.getElementById('appointments-list');

    if (toggleAppointmentsBtn && appointmentsSection) {
        toggleAppointmentsBtn.addEventListener('click', () => {
            const isVisible = appointmentsSection.style.display !== 'none';
            appointmentsSection.style.display = isVisible ? 'none' : 'block';
            toggleAppointmentsBtn.innerHTML = isVisible ? 
                '<i class="fas fa-calendar-alt"></i> Voir tous les rendez-vous' : 
                '<i class="fas fa-calendar-alt"></i> Cacher les rendez-vous';
            
            if (!isVisible) {
                loadAllAppointments();
            }
        });
    }

    // Délégation d'événement pour les boutons Modifier/Annuler dans la liste des rendez-vous
    if (appointmentsList) {
        appointmentsList.addEventListener('click', function(e) {
            const cancelBtn = e.target.closest('.cancel-btn');
            if (cancelBtn) {
                const id = cancelBtn.getAttribute('data-id');
                if (id) cancelAppointment(Number(id));
            }
        });
    }
});

// Logout
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        try {
            await fetch('/api/logout', {
                method: 'POST',
                credentials: 'include'
            });
            window.location.href = '/login.html';
        } catch (error) {
            console.error('Error during logout:', error);
        }
    });
}

function showMainInterface(user) {
    if (userRole) {
        userRole.textContent = `Connecté en tant que ${user.role}`;
    }
}

// Load dieticians for selection
async function loadDieticians() {
    try {
        const response = await fetch('/api/users?role=dieteticien');
        const dieticians = await response.json();
        dieticianSelect.innerHTML = '<option value="">Sélectionner un diététicien...</option>' +
            dieticians.map(d => `<option value="${d.id}">${d.username}</option>`).join('');
    } catch (error) {
        console.error('Error loading dieticians:', error);
        // Add default dieticians if API call fails
        const defaultDieticians = [
            { id: 1, username: 'Dr. Marie Laurent' },
            { id: 2, username: 'Dr. Pierre Dubois' },
            { id: 3, username: 'Dr. Sophie Martin' }
        ];
        dieticianSelect.innerHTML = '<option value="">Sélectionner un diététicien...</option>' +
            defaultDieticians.map(d => `<option value="${d.id}">${d.username}</option>`).join('');
        showNotification('Chargement des diététiciens par défaut', 'info');
    }
}

// Patient Management
async function searchPatient() {
    const searchTerm = document.getElementById('patient-search').value;
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
    if (!window.patientListVisible) {
        resultsDiv.style.display = 'none';
        resultsDiv.innerHTML = '';
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
            </div>
        </div>
    `).join('');
}

// Show/Hide Add Patient Form
if (showAddPatientBtn) {
    showAddPatientBtn.addEventListener('click', () => {
        const form = document.getElementById('patient-form');
        form.style.display = form.style.display === 'none' ? 'block' : 'none';
    });
}

// Add new patient
if (patientForm) {
    patientForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const patientData = {
            first_name: document.getElementById('first-name').value,
            last_name: document.getElementById('last-name').value,
            phone: document.getElementById('phone').value,
            email: document.getElementById('email').value,
            address: document.getElementById('address').value
        };

        try {
            const response = await fetch('/api/patients', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(patientData)
            });

            if (response.ok) {
                patientForm.reset();
                patientForm.style.display = 'none';
                searchPatient();
                showNotification('Patient ajouté avec succès');
            }
        } catch (error) {
            console.error('Error adding patient:', error);
            showNotification('Erreur lors de l\'ajout du patient', 'error');
        }
    });
}

// Edit patient
function openEditModal(patientId) {
    fetch(`/api/patients/${patientId}`)
        .then(response => response.json())
        .then(patient => {
            document.getElementById('edit-patient-id').value = patient.id;
            document.getElementById('edit-first-name').value = patient.first_name;
            document.getElementById('edit-last-name').value = patient.last_name;
            document.getElementById('edit-phone').value = patient.phone;
            document.getElementById('edit-email').value = patient.email;
            document.getElementById('edit-address').value = patient.address;
            patientModal.style.display = 'block';
        });
}

// Edit patient form submission
const editPatientForm = document.getElementById('edit-patient-form');
if (editPatientForm) {
    editPatientForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const patientId = document.getElementById('edit-patient-id').value;
        const patientData = {
            first_name: document.getElementById('edit-first-name').value,
            last_name: document.getElementById('edit-last-name').value,
            phone: document.getElementById('edit-phone').value,
            email: document.getElementById('edit-email').value,
            address: document.getElementById('edit-address').value
        };

        try {
            const response = await fetch(`/api/patients/${patientId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(patientData)
            });

            if (response.ok) {
                patientModal.style.display = 'none';
                searchPatient();
                showNotification('Patient modifié avec succès');
            }
        } catch (error) {
            console.error('Error updating patient:', error);
            showNotification('Erreur lors de la modification du patient', 'error');
        }
    });
}

// Fonction pour sélectionner un diététicien et passer à l'étape suivante
function selectDietician() {
    const dieticianId = dieticianSelect.value;
    if (!dieticianId) {
        showNotification('Veuillez sélectionner un diététicien', 'error');
        return;
    }
    
    // Cacher l'étape 1 et afficher l'étape 3 directement
    document.getElementById('step1').style.display = 'none';
    document.getElementById('step3').style.display = 'block';
    
    // Afficher les créneaux horaires
    showTimeSlots(new Date().toISOString().split('T')[0], dieticianId);
}

// Fonction pour revenir à l'étape précédente
function previousStep(currentStep) {
    if (currentStep === 3) {
        document.getElementById('step3').style.display = 'none';
        document.getElementById('step1').style.display = 'block';
    }
}

async function showTimeSlots(date, dieticianId) {
    // Generate simple time slots from 8h to 17h
    const slots = [];
    for (let hour = 8; hour <= 17; hour++) {
        const time = `${hour.toString().padStart(2, '0')}:00`;
        slots.push({ time, isBooked: false });
    }

    displayTimeSlots(slots, date, dieticianId);
}

function displayTimeSlots(slots, date, dieticianId) {
    const timeSlotsContainer = document.getElementById('time-slots');
    timeSlotsContainer.innerHTML = `
        <div class="time-slots-header">
            <h3>Liste des horaires</h3>
        </div>
        <div class="time-slots-list">
            ${slots.map(slot => `
                <div class="time-slot" onclick="selectTimeSlot('${date}', '${slot.time}', ${dieticianId})">
                    ${slot.time}
                </div>
            `).join('')}
        </div>
    `;
}

function selectTimeSlot(date, time, dieticianId) {
    const selectedSlot = document.querySelector(`.time-slot[onclick*="${time}"]`);
    if (selectedSlot) {
        // Remove selection from other slots
        document.querySelectorAll('.time-slot.selected').forEach(slot => {
            slot.classList.remove('selected');
        });
        // Add selection to clicked slot
        selectedSlot.classList.add('selected');
        // Stocker l'horaire sélectionné
        window.selectedAppointmentTime = time;
        // Activer le bouton Continuer
        const continueTimeBtn = document.getElementById('continue-time-btn');
        if (continueTimeBtn) continueTimeBtn.disabled = false;
    }
}

// Fonction pour passer à l'étape suivante après sélection de l'horaire
function selectTime() {
    if (!window.selectedAppointmentTime) {
        showNotification('Veuillez sélectionner un horaire', 'error');
        return;
    }
    document.getElementById('step2').classList.remove('active');
    document.getElementById('step3').classList.add('active');
    document.getElementById('progress-step2').classList.add('completed');
    document.getElementById('progress-step3').classList.add('active');
}

function showValidationForm(date, time, dieticianId) {
    const dieticianName = dieticianSelect.options[dieticianSelect.selectedIndex].text;
    const confirmationDiv = document.createElement('div');
    confirmationDiv.className = 'validation-form';
    confirmationDiv.innerHTML = `
        <div class="form-content">
            <p><strong>Horaire sélectionné:</strong> ${time}</p>
            <div class="form-group">
                <input type="text" id="patient-name" placeholder="Nom du patient" required>
            </div>
            <div class="form-group">
                <input type="text" id="patient-firstname" placeholder="Prénom du patient" required>
            </div>
            <button onclick="validatePatientInfo()" class="btn-validate">
                Valider
            </button>
        </div>
    `;
    
    // Remove any existing form
    const existingForm = document.querySelector('.validation-form');
    if (existingForm) {
        existingForm.remove();
    }
    
    document.getElementById('time-slots').appendChild(confirmationDiv);
}

// Function to handle patient info validation and move to next step
function validatePatientInfo() {
    const patientNameInput = document.getElementById('patient-name');
    const patientFirstnameInput = document.getElementById('patient-firstname');
    const summaryDate = document.getElementById('summary-date');
    const summaryTime = document.getElementById('summary-time');
    const summaryPatient = document.getElementById('summary-patient');

    const patientName = patientNameInput ? patientNameInput.value : '';
    const patientFirstname = patientFirstnameInput ? patientFirstnameInput.value : '';

    if (!patientName || !patientFirstname) {
        showNotification('Veuillez remplir le nom et le prénom du patient', 'error');
        return;
    }

    // Store patient info
    window.selectedPatientName = patientName;
    window.selectedPatientFirstname = patientFirstname;

    // Hide current step
    const step3 = document.getElementById('step3');
    const step4 = document.getElementById('step4');
    if (step3) step3.classList.remove('active');
    if (step4) step4.classList.add('active');
    // Update progress bar
    const progressStep3 = document.getElementById('progress-step3');
    const progressStep4 = document.getElementById('progress-step4');
    if (progressStep3) progressStep3.classList.add('completed');
    if (progressStep4) progressStep4.classList.add('active');

    // Update summary details
    if (summaryDate && window.selectedAppointmentDate) summaryDate.textContent = new Date(window.selectedAppointmentDate).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    if (summaryTime && window.selectedAppointmentTime) summaryTime.textContent = window.selectedAppointmentTime;
    if (summaryPatient) summaryPatient.textContent = `${window.selectedPatientFirstname} ${window.selectedPatientName}`;
}

// Function to confirm the appointment
async function confirmAppointment() {
    const date = window.selectedAppointmentDate;
    const time = window.selectedAppointmentTime;
    const patientName = window.selectedPatientName;
    const patientFirstname = window.selectedPatientFirstname;
    const dieticianSelect = document.getElementById('dietician-select');
    const dieticianId = dieticianSelect ? dieticianSelect.value : '';

    if (!date) {
        showNotification('Veuillez sélectionner une date', 'error');
        return;
    }
    if (!time || !patientName || !patientFirstname) {
        showNotification('Informations du rendez-vous incomplètes.', 'error');
        return;
    }

    try {
        const response = await fetch('/api/appointments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                date: date,
                time: time,
                first_name: patientFirstname,
                last_name: patientName,
                dietician_id: dieticianId ? parseInt(dieticianId) : null
            })
        });
        console.log('API response status:', response.status);
        if (response.ok) {
            console.log('Appointment confirmed successfully.');
            // Show the styled confirmation step (step5)
            document.querySelectorAll('.booking-step').forEach(step => step.classList.remove('active'));
            const step5 = document.getElementById('step5');
            if (step5) step5.classList.add('active');
            // Optionally, update progress bar
            document.querySelectorAll('.progress-step').forEach(step => step.classList.remove('active', 'completed'));
            const progressStep5 = document.getElementById('progress-step5');
            if (progressStep5) progressStep5.classList.add('active', 'completed');
            await loadTodayAppointments();
            const appointmentDateInput = document.getElementById('appointment-date');
            if (appointmentDateInput) appointmentDateInput.value = date;
            await loadAllAppointments();
        } else {
            const error = await response.json();
            console.error('API error:', error);
            showNotification(`Erreur lors de la validation: ${error.message || response.statusText}`, 'error');
        }
    } catch (error) {
        console.error('Error during fetch:', error);
        showNotification('Erreur lors de la validation du rendez-vous. Vérifiez la console pour les détails.', 'error');
    }
}

// Function to cancel the booking process and reset
function cancelBooking() {
    // Hide all steps
    document.querySelectorAll('.booking-step').forEach(step => step.classList.remove('active'));
    // Show step 1
    const step1 = document.getElementById('step1');
    if (step1) step1.classList.add('active');
    // Reset progress bar
    document.querySelectorAll('.progress-step').forEach(step => step.classList.remove('active', 'completed'));
    const progressStep1 = document.getElementById('progress-step1');
    if (progressStep1) progressStep1.classList.add('active');

    // Clear stored data
    window.selectedAppointmentDate = null;
    window.selectedAppointmentTime = null;
    window.selectedPatientName = null;
    window.selectedPatientFirstname = null;
    // Reset dietician select (optional, depending on flow)
    if (typeof dieticianSelect !== 'undefined' && dieticianSelect && 'value' in dieticianSelect) dieticianSelect.value = '';

    // Reset displayed selected date/time/patient
    const displaySelectedDate = document.getElementById('display-selected-date');
    if (displaySelectedDate) displaySelectedDate.textContent = 'Aucune date sélectionnée';
    const continueDateBtn = document.getElementById('continue-date-btn');
    if (continueDateBtn) continueDateBtn.disabled = true;

    // Clear time slots display
    const timeSlotsDiv = document.getElementById('time-slots');
    if (timeSlotsDiv) timeSlotsDiv.innerHTML = '';

    // Clear patient info fields
    const patientNameInput = document.getElementById('patient-name');
    if (patientNameInput) patientNameInput.value = '';
    const patientFirstnameInput = document.getElementById('patient-firstname');
    if (patientFirstnameInput) patientFirstnameInput.value = '';

    // Remove confirmation summary if it exists
    const existingSummary = document.querySelector('.appointment-summary');
    if (existingSummary) existingSummary.remove();
}

// Fonction pour charger tous les rendez-vous
async function loadAllAppointments() {
    const appointmentsList = document.getElementById('appointments-list');
    
    try {
        const response = await fetch('/api/appointments');
        if (!response.ok) throw new Error('Erreur lors de la récupération des rendez-vous');
        
        const appointments = await response.json();
        
        if (appointments.length === 0) {
            appointmentsList.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: #666; background: #f8f9fa; border-radius: 8px;">
                    <i class="fas fa-calendar-times" style="font-size: 2rem; margin-bottom: 1rem; color: #5a8dee;"></i>
                    <p>Aucun rendez-vous trouvé.</p>
                </div>`;
            return;
        }

        appointmentsList.innerHTML = appointments.map(apt => `
            <div class="appointment-card" style="background: white; padding: 1.5rem; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border-left: 4px solid #5a8dee;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                    <div>
                        <h4 style="color: #5a8dee; margin: 0 0 0.5rem 0; font-size: 1.1rem;">
                            <i class="fas fa-user"></i> ${apt.first_name} ${apt.last_name}
                        </h4>
                        <p style="color: #666; margin: 0;">
                            <i class="fas fa-user-md"></i> ${apt.dietician_name || 'Diététicien non spécifié'}
                        </p>
                    </div>
                    <span style="background: #e8f0fe; color: #5a8dee; padding: 0.3rem 0.8rem; border-radius: 20px; font-size: 0.9rem;">
                        ${apt.time}
                    </span>
                </div>
                <div style="color: #666; font-size: 0.95rem;">
                    <p style="margin: 0.5rem 0;">
                        <i class="fas fa-calendar"></i> ${new Date(apt.date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                </div>
                <div style="display: flex; gap: 0.5rem; margin-top: 1rem;">
                    <button class="cancel-btn" data-id="${apt.id}" style="flex: 1; padding: 0.5rem; border: none; border-radius: 6px; background: #fee8e8; color: #e74c3c; cursor: pointer;">
                        <i class="fas fa-times"></i> Annuler
                    </button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading appointments:', error);
        appointmentsList.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: #e74c3c; background: #fdf3f2; border-radius: 8px;">
                <i class="fas fa-exclamation-circle" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                <p>Erreur lors du chargement des rendez-vous.</p>
                <p style="font-size: 0.9rem; color: #666;">${error.message}</p>
            </div>`;
    }
}

// S'assurer que les fonctions sont globales
window.editAppointment = async function(appointmentId) {
    // À personnaliser selon la logique de modification souhaitée
    alert('Fonction de modification à implémenter pour le rendez-vous #' + appointmentId);
};

window.cancelAppointment = async function(appointmentId) {
    if (!confirm('Êtes-vous sûr de vouloir annuler ce rendez-vous ?')) return;
    try {
        const response = await fetch(`/api/appointments/${appointmentId}`, {
            method: 'DELETE'
        });
        if (response.ok) {
            loadAllAppointments();
            showNotification('Rendez-vous annulé avec succès');
        }
    } catch (error) {
        console.error('Error cancelling appointment:', error);
        showNotification('Erreur lors de l\'annulation du rendez-vous', 'error');
    }
};

async function loadTodayAppointments() {
    const today = new Date().toISOString().split('T')[0];
    try {
        const response = await fetch(`/api/appointments?date=${today}`);
        const appointments = await response.json();
        displayTodayAppointments(appointments);
    } catch (error) {
        console.error('Error loading today\'s appointments:', error);
        showNotification('Erreur lors du chargement des rendez-vous du jour', 'error');
    }
}

function displayTodayAppointments(appointments) {
    const todayList = document.getElementById('today-list');
    if (!todayList) return; // Prevent error if element is missing
    todayList.innerHTML = appointments.map(apt => `
        <div class="appointment-item ${apt.status === 'cancelled' ? 'cancelled' : ''}">
            <div>
                <strong>${apt.time}</strong> - ${apt.first_name} ${apt.last_name}
            </div>
            <div class="action-buttons">
                <button onclick="validateAppointment(${apt.id})">
                    <i class="fas fa-check"></i> Valider
                </button>
                <button onclick="cancelAppointment(${apt.id})">
                    <i class="fas fa-times"></i> Annuler
                </button>
            </div>
        </div>
    `).join('');
}

// Modal close button
if (closeModal) {
    closeModal.onclick = function() {
        patientModal.style.display = 'none';
    }
}

window.onclick = function(event) {
    if (event.target == patientModal) {
        patientModal.style.display = 'none';
    }
}

// Notification system
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
        ${message}
    `;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Fonction pour passer à l'étape suivante après sélection de la date
function selectDate() {
    if (!window.selectedAppointmentDate) {
        showNotification('Veuillez sélectionner une date', 'error');
        return;
    }
    document.getElementById('step1').classList.remove('active');
    document.getElementById('step2').classList.add('active');
    document.getElementById('progress-step1').classList.add('completed');
    document.getElementById('progress-step2').classList.add('active');
    // Stocker la date sélectionnée pour la suite
    // ... (autres actions si besoin)
} 