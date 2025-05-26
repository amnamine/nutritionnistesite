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

    // Initialisation du calendrier FullCalendar v5+
    if (calendar) {
        const displaySelectedDate = document.getElementById('display-selected-date');
        const continueDateBtn = document.getElementById('continue-date-btn');
        window.selectedAppointmentDate = null;
        const calendarObj = new FullCalendar.Calendar(calendar, {
            locale: 'fr',
            initialView: 'dayGridMonth',
            selectable: true,
            select: function(info) {
                const dateStr = info.startStr;
                window.selectedAppointmentDate = dateStr;
                if (displaySelectedDate) displaySelectedDate.textContent = moment(dateStr).format('dddd D MMMM YYYY');
                if (continueDateBtn) continueDateBtn.disabled = false;
            }
        });
        calendarObj.render();
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
document.getElementById('edit-patient-form').addEventListener('submit', async (e) => {
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
        
        // Show simple validation form
        showValidationForm(date, time, dieticianId);
    }
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
    const patientName = document.getElementById('patient-name').value;
    const patientFirstname = document.getElementById('patient-firstname').value;

    if (!patientName || !patientFirstname) {
        showNotification('Veuillez remplir le nom et le prénom du patient', 'error');
        return;
    }

    // Store patient info
    window.selectedPatientName = patientName;
    window.selectedPatientFirstname = patientFirstname;

    // Hide current step
    document.getElementById('step3').classList.remove('active');
    // Show next step
    document.getElementById('step4').classList.add('active');
    // Update progress bar
    document.getElementById('progress-step3').classList.add('completed');
    document.getElementById('progress-step4').classList.add('active');

    // Update summary details
    document.getElementById('summary-date').textContent = new Date(window.selectedAppointmentDate).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    document.getElementById('summary-time').textContent = window.selectedAppointmentTime;
    document.getElementById('summary-patient').textContent = `${window.selectedPatientFirstname} ${window.selectedPatientName}`;
}

// Function to confirm the appointment
async function confirmAppointment() {
    console.log('Attempting to confirm appointment...');
    const date = window.selectedAppointmentDate;
    const time = window.selectedAppointmentTime;
    const patientName = window.selectedPatientName;
    const patientFirstname = window.selectedPatientFirstname;
    const dieticianId = dieticianSelect.value;

    console.log('Appointment data:', { date, time, patientName, patientFirstname, dieticianId });

    if (!date || !time || !patientName || !patientFirstname || !dieticianId) {
        console.error('Missing appointment data:', { date, time, patientName, patientFirstname, dieticianId });
        showNotification('Informations du rendez-vous incomplètes. Veuillez recommencer.', 'error');
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
                dietician_id: parseInt(dieticianId)
            })
        });

        console.log('API response status:', response.status);

        if (response.ok) {
            console.log('Appointment confirmed successfully.');
            showNotification('Rendez-vous validé avec succès');
            
            // Réinitialiser le processus de réservation
            cancelBooking();
            
            // Mettre à jour la liste des rendez-vous du jour
            await loadTodayAppointments();
            
            // Mettre à jour la liste des rendez-vous pour la date sélectionnée
            document.getElementById('appointment-date').value = date;
            await searchAppointments();
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
    document.getElementById('step1').classList.add('active');
    // Reset progress bar
    document.querySelectorAll('.progress-step').forEach(step => step.classList.remove('active', 'completed'));
    document.getElementById('progress-step1').classList.add('active');
    
    // Clear stored data
    window.selectedAppointmentDate = null;
    window.selectedAppointmentTime = null;
    window.selectedPatientName = null;
    window.selectedPatientFirstname = null;
    // Reset dietician select (optional, depending on flow)
    dieticianSelect.value = '';
    
    // Reset displayed selected date/time/patient
    document.getElementById('display-selected-date').textContent = 'Aucune date sélectionnée';
    document.getElementById('continue-date-btn').disabled = true;
    
    // Clear time slots display
    document.getElementById('time-slots').innerHTML = '';
    
    // Clear patient info fields
    const patientNameInput = document.getElementById('patient-name');
    if (patientNameInput) patientNameInput.value = '';
    const patientFirstnameInput = document.getElementById('patient-firstname');
    if (patientFirstnameInput) patientFirstnameInput.value = '';

    // Remove confirmation summary if it exists
     const existingSummary = document.querySelector('.appointment-summary');
     if (existingSummary) existingSummary.remove();
}

async function searchAppointments() {
    const date = document.getElementById('appointment-date').value;
    const dieticianId = dieticianSelect.value;
    if (!date || !dieticianId) {
        showNotification('Veuillez sélectionner une date et un diététicien', 'error');
        return;
    }

    try {
        const response = await fetch(`/api/appointments?date=${date}&dieticianId=${dieticianId}`);
        const appointments = await response.json();
        displayAppointments(appointments);
    } catch (error) {
        console.error('Error searching appointments:', error);
        showNotification('Erreur lors de la recherche des rendez-vous', 'error');
    }
}

function displayAppointments(appointments) {
    const listDiv = document.getElementById('appointment-list');
    listDiv.innerHTML = appointments.map(apt => `
        <div class="appointment-card">
            <h3>${apt.first_name} ${apt.last_name}</h3>
            <p><i class="fas fa-calendar"></i> ${apt.date}</p>
            <p><i class="fas fa-clock"></i> ${apt.time}</p>
            <div class="action-buttons">
                <button class="edit-btn" onclick="editAppointment(${apt.id})">
                    <i class="fas fa-edit"></i> Modifier
                </button>
                <button class="cancel-btn" onclick="cancelAppointment(${apt.id})">
                    <i class="fas fa-times"></i> Annuler
                </button>
            </div>
        </div>
    `).join('');
}

async function editAppointment(appointmentId) {
    // Show calendar for rescheduling
    $(calendar).fullCalendar('today');
}

async function cancelAppointment(appointmentId) {
    if (!confirm('Êtes-vous sûr de vouloir annuler ce rendez-vous ?')) return;

    try {
        const response = await fetch(`/api/appointments/${appointmentId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            searchAppointments();
            showNotification('Rendez-vous annulé avec succès');
        }
    } catch (error) {
        console.error('Error cancelling appointment:', error);
        showNotification('Erreur lors de l\'annulation du rendez-vous', 'error');
    }
}

async function loadTodayAppointments() {
    const today = new Date().toISOString().split('T')[0];
    const dieticianId = dieticianSelect.value;
    if (!dieticianId) {
        showNotification('Veuillez sélectionner un diététicien', 'error');
        return;
    }

    try {
        const response = await fetch(`/api/appointments?date=${today}&dieticianId=${dieticianId}`);
        const appointments = await response.json();
        displayTodayAppointments(appointments);
    } catch (error) {
        console.error('Error loading today\'s appointments:', error);
        showNotification('Erreur lors du chargement des rendez-vous du jour', 'error');
    }
}

function displayTodayAppointments(appointments) {
    const todayList = document.getElementById('today-list');
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