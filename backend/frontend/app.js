// ==================== API LAYER ====================
// All data operations go through the Express backend.
// LocalStorage is ONLY used for: theme preference.

const API_BASE_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3000/api'
  : '/api';

// Local date helper — avoids UTC offset issues (e.g. PH is UTC+8)
const getLocalDateStr = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

// ==================== LANGUAGE / TRANSLATIONS ====================
const TRANSLATIONS = {
  en: {
    // Registration form
    createAccountTitle: 'Create Account',
    lastName: 'Last Name', firstName: 'First Name', middleInitial: 'M.I.',
    dateOfBirth: 'Date of Birth', dobHint: 'Must be 18–85 years old to register',
    accountConfirmation: 'Account Confirmation Via',
    email: 'Email', mobile: 'Mobile',
    emailPlaceholder: 'email@example.com', mobilePlaceholder: '09XXXXXXXXX or 8-digit landline',
    username: 'Username', usernamePlaceholder: 'Choose a username (min 3 characters)',
    password: 'Password', passwordPlaceholder: 'Create a password',
    confirmPassword: 'Confirm Password', confirmPasswordPlaceholder: 'Re-enter your password',
    registerBtn: 'Create Account', alreadyHaveAccount: 'Already have an account?', signIn: 'Sign In',
    // Resident tabs
    queueStatus: 'Queue Status', myAppointments: 'My Appointments',
    bookAppointment: 'Book Appointment', myVisitHistory: 'My Visit History',
    // Booking form
    appointmentSchedule: 'Appointment Schedule',
    appointmentDate: 'Appointment Date', appointmentTime: 'Appointment Time',
    selectTimeSlot: '-- Select a Time Slot --',
    serviceCategory: 'Service Category', selectServiceCategory: 'Select service category',
    serviceType: 'Service Type', selectServiceFirst: 'Please select a service category first',
    priorityLevel: 'Priority Level', selectServiceTypeFirst: 'Please select a service type first',
    notes: 'Additional Notes (optional)', notesPlaceholder: 'Any additional information for the clinic...',
    submitBooking: 'Submit Appointment Request',
    // Queue status
    yourQueueNumber: 'Your Queue Number',
    queuePosition: 'Position in Queue',
    estimatedWait: 'Estimated Wait',
    clinicStatus: 'Clinic Status',
    // Login page
    loginTitle: 'Sign In', loginUsername: 'Username', loginPassword: 'Password',
    loginBtn: 'Sign In', forgotPassword: 'Forgot Password?',
    noAccount: "Don't have an account?",
    langToggle: 'Filipino',
  },
  fil: {
    // Registration form
    createAccountTitle: 'Gumawa ng Account',
    lastName: 'Apelyido', firstName: 'Pangalan', middleInitial: 'G.N.',
    dateOfBirth: 'Petsa ng Kapanganakan', dobHint: 'Dapat 18–85 taong gulang para makapag-rehistro',
    accountConfirmation: 'Kumpirmahin ang Account Sa',
    email: 'Email', mobile: 'Cellphone',
    emailPlaceholder: 'email@halimbawa.com', mobilePlaceholder: '09XXXXXXXXX o 8-digit landline',
    username: 'Username', usernamePlaceholder: 'Pumili ng username (min 3 character)',
    password: 'Password', passwordPlaceholder: 'Gumawa ng password',
    confirmPassword: 'Kumpirmahin ang Password', confirmPasswordPlaceholder: 'Ilagay ulit ang iyong password',
    registerBtn: 'Gumawa ng Account', alreadyHaveAccount: 'Mayroon nang account?', signIn: 'Mag-sign in',
    // Resident tabs
    queueStatus: 'Status ng Pila', myAppointments: 'Aking mga Appointment',
    bookAppointment: 'Mag-book ng Appointment', myVisitHistory: 'History ng Pagbisita',
    // Booking form
    appointmentSchedule: 'Iskedyul ng Appointment',
    appointmentDate: 'Petsa ng Appointment', appointmentTime: 'Oras ng Appointment',
    selectTimeSlot: '-- Pumili ng Oras --',
    serviceCategory: 'Uri ng Serbisyo', selectServiceCategory: 'Pumili ng uri ng serbisyo',
    serviceType: 'Klase ng Serbisyo', selectServiceFirst: 'Pumili muna ng uri ng serbisyo',
    priorityLevel: 'Antas ng Prioridad', selectServiceTypeFirst: 'Pumili muna ng klase ng serbisyo',
    notes: 'Karagdagang Impormasyon (opsyonal)', notesPlaceholder: 'Anumang karagdagang impormasyon para sa klinika...',
    submitBooking: 'Ipasa ang Kahilingan sa Appointment',
    // Queue status
    yourQueueNumber: 'Iyong Numero sa Pila',
    queuePosition: 'Posisyon sa Pila',
    estimatedWait: 'Tinatayang Oras ng Paghihintay',
    clinicStatus: 'Status ng Klinika',
    // Login page
    loginTitle: 'Mag-sign In', loginUsername: 'Username', loginPassword: 'Password',
    loginBtn: 'Mag-sign In', forgotPassword: 'Nakalimutan ang Password?',
    noAccount: 'Wala pang account?',
    langToggle: 'English',
  }
};

let _authToken = (() => { try { return sessionStorage.getItem('ht_token') || null; } catch { return null; } })();
const getToken = () => _authToken;
const setToken = (t) => {
  _authToken = t;
  try { if (t) sessionStorage.setItem('ht_token', t); else sessionStorage.removeItem('ht_token'); } catch {}
};

// Central fetch helper — attaches Bearer token, throws on non-2xx
async function api(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  const tok = getToken();
  if (tok) headers['Authorization'] = 'Bearer ' + tok;
  const res = await fetch(API_BASE_URL + path, {
    method, headers,
    body: body != null ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = new Error(data.error || ('HTTP ' + res.status));
    e.status = res.status; e.data = data; throw e;
  }
  return data;
}

// ── Normalizers: DB snake_case → frontend camelCase ─────────────────────────
function normalizePatient(p) {
  if (!p) return null;
  return {
    id: p.patient_id||p.id,  patientId: p.patient_id||p.patientId,
    firstName:  p.first_name ||p.firstName ||'',  lastName: p.last_name||p.lastName||'',
    middleName: p.middle_name||p.middleName||'',
    dateOfBirth: p.date_of_birth||p.dateOfBirth||'',
    age: p.age||0, sex: p.sex||'', address: p.address||'',
    contact:       p.contact_number||p.contactNumber||p.contact||'',
    contactNumber: p.contact_number||p.contactNumber||p.contact||'',
    civilStatus:   p.civil_status  ||p.civilStatus  ||'',  occupation: p.occupation||'',
    philHealthNumber:       p.philhealth_number      ||p.philHealthNumber      ||'',
    pwdId:                  p.pwd_id                 ||p.pwdId                 ||'',
    emergencyContactPerson: p.emergency_contact_person||p.emergencyContactPerson||'',
    emergencyContactNumber: p.emergency_contact_number||p.emergencyContactNumber||'',
    allergies:         p.allergies         ||'',
    chronicConditions: p.chronic_conditions||p.chronicConditions||'',
    currentMedications:p.current_medications||p.currentMedications||'',
    registeredDate:   p.created_at||p.registeredDate||'',
    registrationDate: p.registration_date||p.registrationDate||p.created_at||'',
  };
}
function normalizeQueue(q) {
  if (!q) return null;
  const fn=q.first_name||'', ln=q.last_name||'';
  return {
    id: q.queue_id||q.id,  queueId: q.queue_id||q.id,
    queueNumber: q.queue_number||q.queueNumber||0,
    patientId:   q.patient_id ||q.patientId ||'',
    name: q.name||(fn&&ln ? fn+' '+ln : ''),
    age: q.age||0, sex: q.sex||'',
    service:         q.service_name    ||q.service        ||'',
    serviceCategory: q.service_category||q.serviceCategory||'',
    priority:      q.priority      ||'Regular',
    chiefComplaint:q.chief_complaint||q.chiefComplaint||'',
    appointmentDate: (q.appointment_date||q.appointmentDate||'').toString().split('T')[0],
    appointmentTime: q.appointment_time||q.appointmentTime||'',
    status:          q.status     ||'Waiting',
    timeQueued:      q.time_queued||q.timeQueued||new Date().toISOString(),
    selfBooked:      !!(q.self_booked||q.selfBooked),
    bookedByUsername: q.booked_by_username||q.bookedByUsername||null,
    rejectedReason:   q.rejected_reason  ||q.rejectedReason  ||'',
    rejectedAt:       q.rejected_at      ||q.rejectedAt      ||null,
  };
}
function normalizeVisit(v) {
  if (!v) return null;
  return {
    id: v.visit_id||v.id,  patientId: v.patient_id||v.patientId||'',
    name: v.name||((v.first_name||'')+' '+(v.last_name||'')).trim(),
    age: v.age||0, sex: v.sex||'',
    service:         v.service_name    ||v.service        ||'',
    serviceCategory: v.service_category||v.serviceCategory||'',
    priority:      v.priority      ||'',
    chiefComplaint:v.chief_complaint||v.chiefComplaint||'',
    visitDate:  v.visit_date||v.visitDate ||v.created_at||'',
    timeQueued: v.time_queued||v.timeQueued||'',
    timeServed: v.time_served||v.timeServed||'',
    diagnosis:   v.diagnosis   ||'', treatment:   v.treatment   ||'',
    prescription:v.prescription||'', notes:       v.notes       ||'',
    address: v.address||'',
    contact: v.contact_number||v.contactNumber||v.contact||'',
    attendedBy: v.attended_by||v.attendedBy||'',
  };
}
function normalizeUser(u) {
  if (!u) return null;
  return {
    id: u.user_id||u.id,  userId: u.user_id||u.id,
    username: u.username||'', role: u.role||'',
    fullName: u.full_name||u.fullName||'', email: u.email||'',
    createdAt: u.created_at||u.createdAt||'', lastLogin: u.last_login||u.lastLogin||'',
  };
}


        const { useState, useEffect } = React;

        // ==================== ICON COMPONENTS ====================
        const Activity = ({ className }) => (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
        );

        const UserPlus = ({ className }) => (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
        );

        const Users = ({ className }) => (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
        );

        const Clock = ({ className }) => (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        );

        const AlertCircle = ({ className }) => (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        );

        const CheckCircle = ({ className }) => (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        );

        const List = ({ className }) => (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
        );

        const Calendar = ({ className }) => (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
        );

        const Download = ({ className }) => (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
        );

        const FileSpreadsheet = ({ className }) => (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
        );

        const Search = ({ className }) => (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
        );

        const Edit = ({ className }) => (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
        );

        const Trash = ({ className }) => (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
        );

        const XCircle = ({ className }) => (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        );

        const Bell = ({ className }) => (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
        );

        const BarChart = ({ className }) => (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
        );

        const FileText = ({ className }) => (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
        );

        const Home = ({ className }) => (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
        );

        const LogOut = ({ className }) => (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
        );

        // ==================== SERVICES CONFIGURATION ====================
        const DEFAULT_SERVICE_CATEGORIES = {
          'Maternal Care': {
            urgency: 'Non-Urgent',
            services: [
              { name: 'Prenatal check-up', priority: 'Regular' },
              { name: 'Postnatal care', priority: 'Regular' },
              { name: 'Safe motherhood education', priority: 'Regular' }
            ]
          },
          'Child Health Services': {
            urgency: 'Non-Urgent',
            services: [
              { name: 'Newborn check-up', priority: 'Regular' },
              { name: 'Immunization/vaccination programs', priority: 'Regular' },
              { name: 'Growth monitoring (weighing, height measurement)', priority: 'Regular' }
            ]
          },
          'Family Planning': {
            urgency: 'Non-Urgent',
            services: [
              { name: 'Counseling sessions', priority: 'Regular' },
              { name: 'Distribution of contraceptives (pills, condoms, injectables)', priority: 'Regular' },
              { name: 'Natural family planning guidance', priority: 'Regular' }
            ]
          },
          'Basic Medical Services': {
            urgency: 'Mixed',
            services: [
              { name: 'First aid treatment for minor injuries', priority: 'Urgent' },
              { name: 'Consultation for common illnesses (fever, cough, colds, diarrhea)', priority: 'Regular' },
              { name: 'Vital signs monitoring (BP, temperature, weight)', priority: 'Regular' },
              { name: 'Referral to hospitals for advanced care', priority: 'Priority Case' }
            ]
          },
          'Nutrition Programs': {
            urgency: 'Non-Urgent',
            services: [
              { name: 'Operation Timbang (child weighing)', priority: 'Regular' },
              { name: 'Nutrition and diet counseling', priority: 'Regular' },
              { name: 'Vitamin supplementation (Vit. A, Iron, etc.)', priority: 'Regular' }
            ]
          },
          'Communicable Disease Control': {
            urgency: 'Urgent',
            services: [
              { name: 'Tuberculosis (TB) screening and referral', priority: 'Urgent' },
              { name: 'Dengue monitoring and awareness campaigns', priority: 'Urgent' },
              { name: 'COVID-19 monitoring', priority: 'Urgent' },
              { name: 'Rabies prevention information', priority: 'Urgent' }
            ]
          },
          'Health Education & Counseling': {
            urgency: 'Non-Urgent',
            services: [
              { name: 'Hygiene and sanitation education', priority: 'Regular' },
              { name: 'Adolescent health counseling', priority: 'Regular' },
              { name: 'Awareness programs for diabetes, hypertension, etc.', priority: 'Regular' }
            ]
          },
          'Environmental Health & Sanitation Services': {
            urgency: 'Non-Urgent',
            services: [
              { name: 'Water sanitation and safety awareness', priority: 'Regular' },
              { name: 'Waste disposal education', priority: 'Regular' },
              { name: 'Community health surveillance', priority: 'Regular' }
            ]
          },
          'Senior Citizen Health Services': {
            urgency: 'Non-Urgent',
            services: [
              { name: 'Blood pressure check', priority: 'Regular' },
              { name: 'Basic medical consultation', priority: 'Regular' },
              { name: 'Maintenance medicine distribution', priority: 'Regular' }
            ]
          },
          'Administrative & Health Records Services': {
            urgency: 'Non-Urgent',
            services: [
              { name: 'Updating barangay health records', priority: 'Regular' },
              { name: 'Health referrals and documents', priority: 'Regular' },
              { name: 'Assistance with health certificates', priority: 'Regular' }
            ]
          }
        };

        // Legacy alias — makes SERVICE_CATEGORIES available outside the component
        // (inside the component, state overrides this via const SERVICE_CATEGORIES = serviceCategories)
        const SERVICE_CATEGORIES = DEFAULT_SERVICE_CATEGORIES;

        // Legacy SERVICES object for backward compatibility
        const SERVICES = {};
        Object.keys(DEFAULT_SERVICE_CATEGORIES).forEach(category => {
          DEFAULT_SERVICE_CATEGORIES[category].services.forEach(service => {
            SERVICES[service.name] = {
              category: DEFAULT_SERVICE_CATEGORIES[category].urgency,
              priority: service.priority
            };
          });
        });

        // ==================== MAIN APP COMPONENT ====================
        // ── AuditLogPanel: proper component so hooks are valid ──────────────
        function AuditLogPanel({ api, List }) {
          const [auditEntries, setAuditEntries] = React.useState([]);
          React.useEffect(() => {
            api('GET', '/audit').then(rows => {
              const safe = (v) => {
                if (v === null || v === undefined) return '';
                if (typeof v === 'object') return JSON.stringify(v);
                return String(v);
              };
              const normalized = (Array.isArray(rows) ? rows : []).map(r => {
                // action: try column first, then details.action, then 'SYSTEM'
                const action = safe(r.action) ||
                  safe(r.details && typeof r.details === 'object' ? r.details.action : '') ||
                  'SYSTEM';
                // username: try column first (skip UUIDs), then details.username
                const rawUser = safe(r.username);
                const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(rawUser);
                const username = (!rawUser || isUUID)
                  ? safe(r.details && typeof r.details === 'object' ? r.details.username : '')
                  : rawUser;
                const role = safe(r.role || (r.details && typeof r.details === 'object' ? r.details.role : ''));
                const details = safe(r.details && typeof r.details === 'object' ? r.details.details : r.details);
                return { action, username, role, details, timestamp: safe(r.created_at || r.timestamp) };
              });
              setAuditEntries(normalized);
            }).catch(() => {});
          }, []);
          const actionColors = {
            LOGIN:            { bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200',  icon: '🔑' },
            LOGOUT:           { bg: 'bg-gray-50',   text: 'text-gray-600',   border: 'border-gray-200',   icon: '🚪' },
            REGISTER:         { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',   icon: '👤' },
            QUEUE_ACCEPTED:   { bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200',  icon: '✅' },
            QUEUE_REJECTED:   { bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200',    icon: '❌' },
            QUEUE_SERVED:     { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',   icon: '✔️' },
            QUEUE_REMOVED:    { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', icon: '🗑️' },
            ADD_QUEUE:        { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', icon: '📋' },
            DELETE_PATIENT:   { bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200',    icon: '⚠️' },
            DELETE_USER:      { bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200',    icon: '🚫' },
            PASSWORD_CHANGED: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', icon: '🔒' },
            ACCOUNT_CREATED:  { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', icon: '🆕' },
          };
          return (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">Audit Log</h2>
                    <p className="text-sm text-gray-500 mt-1">Complete record of all system actions — who did what and when</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="bg-gray-100 text-gray-600 text-xs px-3 py-1.5 rounded-full font-medium">{auditEntries.length} entries</span>
                    <button
                      onClick={() => api('DELETE', '/audit').then(() => setAuditEntries([])).catch(() => {})}
                      className="text-xs text-red-500 hover:text-red-700 px-3 py-1.5 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                    >Clear Log</button>
                  </div>
                </div>
                {auditEntries.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <List className="w-8 h-8 text-gray-300" />
                    </div>
                    <p className="text-gray-500 font-medium">No audit entries yet</p>
                    <p className="text-gray-400 text-sm mt-1">Actions taken in the system will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                    {auditEntries.map((entry, i) => {
                      const ac = actionColors[entry.action] || { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200', icon: '📌' };
                      return (
                        <div key={i} className={`flex items-start gap-3 border rounded-xl px-4 py-3 ${ac.bg} ${ac.border}`}>
                          <span className="text-xl flex-shrink-0 mt-0.5">{ac.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <span className={`text-sm font-bold ${ac.text}`}>{String(entry.action || '').replace(/_/g,' ')}</span>
                              <span className="text-xs text-gray-400 flex-shrink-0">
                                {new Date(entry.timestamp).toLocaleString('en-PH', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })}
                              </span>
                            </div>
                            <p className="text-xs text-gray-600 mt-0.5">
                              <span className="font-medium">By:</span> {entry.username || 'System'} ({entry.role || 'unknown'})
                              {entry.details ? <span className="ml-2 text-gray-500">— {typeof entry.details === 'object' ? JSON.stringify(entry.details) : String(entry.details)}</span> : null}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        }

        
        // ── Default Doctors ───────────────────────────────────────────────────
        const DEFAULT_DOCTORS = [
          { id: 'doc-1', name: 'Dr. Maria Santos', specialty: 'General Physician', schedules: [{day:'Monday',start:'08:00',end:'17:00'},{day:'Tuesday',start:'08:00',end:'17:00'},{day:'Wednesday',start:'08:00',end:'17:00'},{day:'Thursday',start:'08:00',end:'17:00'},{day:'Friday',start:'08:00',end:'17:00'}], enabled: true },
          { id: 'doc-2', name: 'Dr. Jose Reyes', specialty: 'Pediatrician', schedules: [{day:'Tuesday',start:'09:00',end:'16:00'},{day:'Thursday',start:'09:00',end:'16:00'}], enabled: true },
          { id: 'doc-3', name: 'Dr. Ana Garcia', specialty: 'OB-GYN', schedules: [{day:'Monday',start:'08:00',end:'12:00'},{day:'Wednesday',start:'13:00',end:'17:00'},{day:'Friday',start:'08:00',end:'17:00'}], enabled: true },
        ];
        const DAYS_OF_WEEK = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
        const SPECIALTIES = ['General Physician','Pediatrician','OB-GYN','Dentist','Cardiologist','Dermatologist','Ophthalmologist','ENT Specialist','Orthopedic','Nurse Practitioner','Other'];

                // ── Avatar color palette ────────────────────────────────────────────
        const AVATAR_COLORS = ['#b91c1c','#1d4ed8','#047857','#7c3aed','#c2410c','#0e7490','#be185d','#4338ca','#065f46','#92400e'];

        // ── Philippine Public Holidays (Regular + Special Non-Working) ────────
        const PH_HOLIDAYS = {
          '2026-01-01': "New Year's Day",
          '2026-02-05': "Chinese New Year",
          '2026-02-25': "EDSA People Power Revolution Anniversary",
          '2026-04-02': "Maundy Thursday",
          '2026-04-03': "Good Friday",
          '2026-04-04': "Black Saturday",
          '2026-04-09': "Araw ng Kagitingan (Day of Valor)",
          '2026-05-01': "Labor Day",
          '2026-06-12': "Independence Day",
          '2026-08-21': "Ninoy Aquino Day",
          '2026-08-25': "National Heroes Day",
          '2026-11-01': "All Saints Day",
          '2026-11-02': "All Souls Day",
          '2026-11-30': "Bonifacio Day",
          '2026-12-08': "Feast of the Immaculate Conception",
          '2026-12-24': "Christmas Eve",
          '2026-12-25': "Christmas Day",
          '2026-12-30': "Rizal Day",
          '2026-12-31': "New Year's Eve",
        };
        const isPHHoliday = (dateStr) => !!PH_HOLIDAYS[dateStr];
        const getPHHolidayName = (dateStr) => PH_HOLIDAYS[dateStr] || null;

        function HealthTrackApp() {
          // ==================== PHONE NUMBER HELPER ====================
          const sanitizePhone = (val) => {
            return val.replace(/[^0-9+]/g, '').replace(/(.)\+/g, '$1');
          };
          const isValidPhone = (val) => {
            if (!val) return true;
            var digits = val.replace(/\D/g,'');
            return digits.length >= 7 && digits.length <= 15;
          };
          const phoneClass = (val) => {
            if (!val) return '';
            if (/[a-zA-Z]/.test(val)) return 'border-red-400 bg-red-50';
            if (!isValidPhone(val)) return 'border-amber-400 bg-amber-50';
            return 'border-green-400 bg-green-50';
          };
          const PhoneMsg = ({ val }) => {
            if (!val) return null;
            const clean = val.replace(/[\s\-]/g, '');
            if (/[a-zA-Z]/.test(clean)) return React.createElement('p', {style:{color:'#dc2626',fontSize:'11px',marginTop:'3px'}}, 'Numbers only — letters not allowed.');
            if (clean.startsWith('09')) {
              if (clean.length < 11) return React.createElement('p', {style:{color:'#f59e0b',fontSize:'11px',marginTop:'3px'}}, `Mobile: needs ${11-clean.length} more digit(s). Format: 09XXXXXXXXX`);
              if (clean.length > 11) return React.createElement('p', {style:{color:'#dc2626',fontSize:'11px',marginTop:'3px'}}, 'Mobile number must be exactly 11 digits.');
              return React.createElement('p', {style:{color:'#16a34a',fontSize:'11px',marginTop:'3px'}}, '✓ Valid mobile number');
            }
            if (/^\d+$/.test(clean)) {
              if (clean.length < 7) return React.createElement('p', {style:{color:'#f59e0b',fontSize:'11px',marginTop:'3px'}}, 'Landline must be 7-8 digits.');
              if (clean.length > 8) return React.createElement('p', {style:{color:'#dc2626',fontSize:'11px',marginTop:'3px'}}, 'Landline must be 7-8 digits only.');
              return React.createElement('p', {style:{color:'#16a34a',fontSize:'11px',marginTop:'3px'}}, '✓ Valid landline number');
            }
            return null;
          };
          // ==================== END PHONE HELPER ====================

          // ==================== THEME SYSTEM ====================
          const DEFAULT_THEME = {
            primary: '#CC0000',
            accent: '#990000',
            bg: '#f8fafc',
          };
          const THEME_VERSION = 'v3';
          const savedTheme = (() => {
            try {
              const raw = JSON.parse(localStorage.getItem('ht_theme'));
              if (!raw || raw._v !== THEME_VERSION) return DEFAULT_THEME;
              return raw;
            } catch(e) { return DEFAULT_THEME; }
          })();
          const [theme, setTheme] = useState(savedTheme);

          const applyTheme = (t) => {
            // Compute derived shades
            const toHex = (c,a) => { const r=parseInt(c.slice(1,3),16), g=parseInt(c.slice(3,5),16), b=parseInt(c.slice(5,7),16); return `rgba(${r},${g},${b},${a})`; };
            const lighten = (c) => { const r=Math.min(255,parseInt(c.slice(1,3),16)+180), g=Math.min(255,parseInt(c.slice(3,5),16)+180), b=Math.min(255,parseInt(c.slice(5,7),16)+180); return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`; };
            const darken = (c) => { const r=Math.max(0,parseInt(c.slice(1,3),16)-30), g=Math.max(0,parseInt(c.slice(3,5),16)-30), b=Math.max(0,parseInt(c.slice(5,7),16)-30); return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`; };
            let el = document.getElementById('ht-theme-vars');
            if (!el) { el = document.createElement('style'); el.id = 'ht-theme-vars'; document.head.appendChild(el); }
            el.textContent = `:root {
              --ht-primary: ${t.primary};
              --ht-primary-dark: ${darken(t.primary)};
              --ht-primary-light: ${lighten(t.primary)};
              --ht-accent: ${t.accent};
              --ht-bg: ${t.bg};
            }
            body { background-color: ${t.bg} !important; }
            .min-h-screen.bg-gray-50 { background-color: ${t.bg} !important; }
            .min-h-screen { background-color: ${t.bg} !important; }
            `;
          };

          useEffect(() => { applyTheme(theme); }, [theme]);

          const saveTheme = (newTheme) => {
            setTheme(newTheme);
            localStorage.setItem('ht_theme', JSON.stringify({...newTheme, _v: THEME_VERSION}));
            applyTheme(newTheme);
          };
          const resetTheme = () => saveTheme(DEFAULT_THEME);
          // ==================== END THEME SYSTEM ====================

          // Core States
          const [userRole, setUserRole] = useState(''); // '', 'admin', 'staff', 'resident'
          const [activeTab, setActiveTab] = useState('dashboard');
          // Language toggle — persisted in localStorage
          const [lang, setLang] = useState(() => { try { return localStorage.getItem('ht_lang') || 'en'; } catch { return 'en'; } });
          const toggleLang = () => { const next = lang === 'en' ? 'fil' : 'en'; setLang(next); try { localStorage.setItem('ht_lang', next); } catch {} };
          const t = (key) => (TRANSLATIONS[lang] || TRANSLATIONS.en)[key] || key;
          const [currentUser, setCurrentUser] = useState(null);
          
          // Authentication States
          const [loginUsername, setLoginUsername] = useState('');
          const [loginPassword, setLoginPassword] = useState('');
          const [loginError, setLoginError] = useState('');
          const [showCreateAccount, setShowCreateAccount] = useState(false);
          const [showForgotPassword, setShowForgotPassword] = useState(false);
          const [forgotMethod, setForgotMethod] = useState('email'); // 'email' | 'mobile'
          const forgotMethodRef = React.useRef('email'); // ref always has current value
          const [forgotMobile, setForgotMobile] = useState('');
          const [showResetPassword, setShowResetPassword] = useState(false);
          const [resetToken, setResetToken] = useState('');
          const [resetForm, setResetForm] = useState({ newPassword:'', confirmPassword:'' });
          const [resetError, setResetError] = useState('');
          const [resetSuccess, setResetSuccess] = useState('');
          const [resetLoading, setResetLoading] = useState(false);

          // ── Settings / Profile states ─────────────────────────────────────
          const [showSettingsMenu, setShowSettingsMenu] = useState(false);
          const [showServiceMgmt, setShowServiceMgmt] = useState(false);
          const [contactNumberError, setContactNumberError] = useState('');
          const [serviceMgmtTab, setServiceMgmtTab] = useState('categories');
          const [editingCategory, setEditingCategory] = useState(null); // {name, urgency} or null
          const [newCategoryForm, setNewCategoryForm] = useState({ name:'', urgency:'Non-Urgent', enabled:true });
          const [editingService, setEditingService] = useState(null); // {category, index, name, priority}
          const [newServiceForm, setNewServiceForm] = useState({ category:'', name:'', priority:'Regular' });
          const [serviceMgmtMsg, setServiceMgmtMsg] = useState('');
          const [showSettingsModal, setShowSettingsModal] = useState(false);
          const [settingsTab, setSettingsTab] = useState('profile'); // 'profile' | 'contact' | 'password' | 'avatar'
          const [settingsForm, setSettingsForm] = useState({ firstName:'', lastName:'', middleInitial:'', email:'', contactNumber:'', currentPassword:'', newPassword:'', confirmNewPassword:'' });
          const [settingsError, setSettingsError] = useState('');
          const [settingsSuccess, setSettingsSuccess] = useState('');
          const [settingsLoading, setSettingsLoading] = useState(false);
          const [avatarColor, setAvatarColor] = useState('#b91c1c');
          const [forgotEmail, setForgotEmail] = useState('');
          const [forgotStatus, setForgotStatus] = useState('');
          const [forgotError, setForgotError] = useState('');
          const [forgotLoading, setForgotLoading] = useState(false);
          const [showPassword, setShowPassword] = useState(false);
          const [showRegPassword, setShowRegPassword] = useState(false);
          const [newAccount, setNewAccount] = useState({
            username: '', password: '', confirmPassword: '', role: 'resident',
            firstName: '', middleInitial: '', lastName: '',
            birthday: '',
            email: '', mobile: '', contactMethod: 'email',
            // Personal info fields (auto-saved to patients table on registration)
            sex: '', civilStatus: '', address: '', contactNumber: '',
            occupation: '', emergencyContactPerson: '', emergencyContactNumber: '',
            allergies: '', chronicConditions: '', currentMedications: '',
          });
          const [registerError, setRegisterError] = useState('');
          const [registerSuccess, setRegisterSuccess] = useState('');

          // ── Login lockout state ──────────────────────────────────────────
          const [loginAttempts, setLoginAttempts] = useState(0);
          const [lockoutUntil, setLockoutUntil] = useState(null); // timestamp ms
          const [lockoutCountdown, setLockoutCountdown] = useState(0);

          // ── Session inactivity state ─────────────────────────────────────
          const [lastActivity, setLastActivity] = useState(Date.now());
          const [showIdleWarning, setShowIdleWarning] = useState(false);
          const [idleCountdown, setIdleCountdown] = useState(120);
          const SESSION_TIMEOUT_MS  = 15 * 60 * 1000; // 15 min
          const SESSION_WARNING_MS  = 2  * 60 * 1000; // warn 2 min before
          const [otpStep, setOtpStep] = useState(false);
          const [otpCode, setOtpCode] = useState('');
          const [otpInput, setOtpInput] = useState('');
          const [otpError, setOtpError] = useState('');
          const [otpContact, setOtpContact] = useState('');
          const [pendingAccount, setPendingAccount] = useState(null);
          const [otpResendCount, setOtpResendCount] = useState(0);

          // NOTE: simpleHash and localStorage-based getAccounts removed.
          // Accounts are now managed by the backend (/api/auth). Use the `users` state.
          const getAccounts = () => users; // kept as alias so JSX references still work

          // Handle Login — calls /api/auth/login, receives JWT
          const MAX_ATTEMPTS = 5;
          const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes

          const handleLogin = async (e) => {
            e.preventDefault();
            setLoginError('');

            // Check lockout
            if (lockoutUntil && Date.now() < lockoutUntil) {
              const secs = Math.ceil((lockoutUntil - Date.now()) / 1000);
              setLoginError(`Account locked. Try again in ${Math.floor(secs/60)}:${String(secs%60).padStart(2,'0')} minutes.`);
              return;
            }
            if (!loginUsername.trim() || !loginPassword.trim()) {
              setLoginError('Please enter both username and password.');
              return;
            }

            // ── DEFAULT ACCOUNTS (for demo/defense) ──────────────────────────
            const DEFAULT_ACCOUNTS = [
              { username: 'admin',    password: 'admin123',    role: 'admin',    fullName: 'Admin User',    userId: 'local-admin' },
              { username: 'staff',    password: 'staff123',    role: 'staff',    fullName: 'Staff User',    userId: 'local-staff' },
              { username: 'resident', password: 'resident123', role: 'resident', fullName: 'Resident User', userId: 'local-resident' },
            ];
            const defaultMatch = DEFAULT_ACCOUNTS.find(
              a => a.username === loginUsername.trim().toLowerCase() && a.password === loginPassword
            );
            if (defaultMatch) {
              const user = {
                id: defaultMatch.userId, userId: defaultMatch.userId,
                username: defaultMatch.username, role: defaultMatch.role,
                fullName: defaultMatch.fullName, email: '',
              };
              setToken('local-dev-token');
              setLoginAttempts(0); setLockoutUntil(null);
              setCurrentUser(user); setUserRole(user.role);
              try { sessionStorage.setItem('ht_user', JSON.stringify(user)); } catch {}
              if (user.role === 'resident') setResidentView('queue');
              else setActiveTab('dashboard');
              setLoginUsername(''); setLoginPassword('');
              setLoginError(''); setShowPassword(false);
              setLastActivity(Date.now());
              return;
            }

            // ── API LOGIN — authenticates against backend/database ───────────
            try {
              setLoginError('');
              const data = await api('POST', '/auth/login', {
                username: loginUsername.trim(), password: loginPassword
              });
              setToken(data.token);
              const user = {
                id: data.user.userId, userId: data.user.userId,
                username: data.user.username, role: data.user.role,
                fullName: data.user.fullName, email: data.user.email,
              };
              setLoginAttempts(0); setLockoutUntil(null);
              setCurrentUser(user); setUserRole(user.role);
              try { sessionStorage.setItem('ht_user', JSON.stringify(user)); } catch {}
              if (user.role === 'resident') setResidentView('queue');
              else setActiveTab('dashboard');
              setLoginUsername(''); setLoginPassword('');
              setLoginError(''); setShowPassword(false);
              setLastActivity(Date.now());
              // Audit: log successful login — pass token explicitly since state update is async
              fetch(API_BASE_URL + '/audit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${data.token}` },
                body: JSON.stringify({ action: 'LOGIN', username: user.username, role: user.role, details: `${user.username} logged in` })
              }).catch(() => {});
            } catch (err) {
              const newAttempts = loginAttempts + 1;
              setLoginAttempts(newAttempts);
              if (newAttempts >= MAX_ATTEMPTS) {
                const until = Date.now() + LOCKOUT_DURATION_MS;
                setLockoutUntil(until); setLoginAttempts(0);
                setLoginError('Too many failed attempts. Login locked for 5 minutes.');
              } else {
                const msg = err.message || 'Invalid username or password.';
                setLoginError(`${msg} ${MAX_ATTEMPTS - newAttempts} attempt${MAX_ATTEMPTS - newAttempts !== 1 ? 's' : ''} remaining.`);
              }
            }
          };


          const handleForgotPassword = async (e) => {
            e.preventDefault();
            setForgotError('');
            const val = forgotEmail.trim();
            if (!val) { setForgotError('Please enter your email or mobile number.'); return; }
            setForgotLoading(true); setForgotStatus('');
            try {
              // Auto-detect: if it starts with 09 or +63, treat as mobile; else email
              const isMobile = /^(09|\+63)[0-9]{9,10}$/.test(val.replace(/\s/g,''));
              const body = isMobile ? { mobile: val } : { email: val };
              const res = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
              });
              const data = await res.json();
              if (!res.ok) { setForgotError(data.error || 'Something went wrong.'); }
              else { setForgotStatus(data.message); setForgotEmail(''); }
            } catch { setForgotError('Network error. Please try again.'); }
            finally { setForgotLoading(false); }
          };

          const openSettings = (tab = 'profile') => {
            setSettingsTab(tab);
            setSettingsForm({
              firstName: currentUser?.fullName?.split(' ')[0] || '',
              lastName: currentUser?.fullName?.split(' ').slice(-1)[0] || '',
              middleInitial: '',
              email: currentUser?.email || '',
              contactNumber: '',
              currentPassword: '', newPassword: '', confirmNewPassword: ''
            });
            setSettingsError(''); setSettingsSuccess('');
            setShowSettingsMenu(false);
            setShowSettingsModal(true);
          };

          const saveSettings = async () => {
            setSettingsError(''); setSettingsSuccess(''); setSettingsLoading(true);
            try {
              if (settingsTab === 'profile') {
                if (!settingsForm.firstName.trim() || !settingsForm.lastName.trim()) {
                  setSettingsError('First and last name are required.'); setSettingsLoading(false); return;
                }
                const fullName = `${settingsForm.firstName.trim()} ${settingsForm.middleInitial.trim() ? settingsForm.middleInitial.trim() + '. ' : ''}${settingsForm.lastName.trim()}`;
                await api('PUT', '/auth/profile', { fullName });
                setCurrentUser(prev => ({ ...prev, fullName }));
                try { const u = JSON.parse(sessionStorage.getItem('ht_user')||'{}'); sessionStorage.setItem('ht_user', JSON.stringify({...u, fullName})); } catch {}
                setSettingsSuccess('Profile updated successfully!');
              } else if (settingsTab === 'contact') {
                if (!settingsForm.contactNumber.trim()) { setSettingsError('Contact number is required.'); setSettingsLoading(false); return; }
                const cn = settingsForm.contactNumber.replace(/[\s\-]/g,'');
                if (cn && !/^(09\d{9}|\d{7,8}|0\d{1,2}-?\d{7,8})$/.test(cn)) {
                  setSettingsError('Enter a valid mobile number (09XXXXXXXXX) or landline (8 digits).'); setSettingsLoading(false); return; }
                await api('PUT', '/auth/profile', { contactNumber: settingsForm.contactNumber.trim() });
                setSettingsSuccess('Contact number updated!');
              } else if (settingsTab === 'email') {
                if (!settingsForm.email.trim()) { setSettingsError('Email is required.'); setSettingsLoading(false); return; }
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settingsForm.email.trim())) { setSettingsError('Please enter a valid email address.'); setSettingsLoading(false); return; }
                await api('PUT', '/auth/profile', { email: settingsForm.email.trim() });
                setCurrentUser(prev => ({ ...prev, email: settingsForm.email.trim() }));
                setSettingsSuccess('Email address updated!');
              } else if (settingsTab === 'password') {
                if (!settingsForm.currentPassword || !settingsForm.newPassword || !settingsForm.confirmNewPassword) {
                  setSettingsError('Please fill in all password fields.'); setSettingsLoading(false); return;
                }
                if (settingsForm.newPassword !== settingsForm.confirmNewPassword) {
                  setSettingsError('New passwords do not match.'); setSettingsLoading(false); return;
                }
                if (settingsForm.newPassword.length < 8) {
                  setSettingsError('New password must be at least 8 characters.'); setSettingsLoading(false); return;
                }
                await api('PUT', '/auth/change-password', { currentPassword: settingsForm.currentPassword, newPassword: settingsForm.newPassword });
                setSettingsSuccess('Password changed successfully!');
                setSettingsForm(f => ({ ...f, currentPassword:'', newPassword:'', confirmNewPassword:'' }));
              } else if (settingsTab === 'avatar') {
                setSettingsSuccess('Avatar color saved!');
              }
            } catch(err) {
              setSettingsError(err.message || 'Update failed. Please try again.');
            } finally { setSettingsLoading(false); }
          };

                    // ── Service Management helpers ───────────────────────────────────────
          const saveServiceCategories = (updated) => {
            setServiceCategories(updated);
            try { localStorage.setItem('ht_service_categories', JSON.stringify(updated)); } catch {}
          };
          const saveSlotCapacity = (val) => {
            const n = Math.max(1, Math.min(200, parseInt(val) || 38));
            setSlotCapacity(n);
            try { localStorage.setItem('ht_slot_capacity', String(n)); } catch {}
          };
          const addCategory = () => {
            const name = newCategoryForm.name.trim();
            if (!name) { setServiceMgmtMsg('Category name is required.'); return; }
            if (serviceCategories[name]) { setServiceMgmtMsg('Category already exists.'); return; }
            const updated = { ...serviceCategories, [name]: { urgency: newCategoryForm.urgency, enabled: true, services: [] } };
            saveServiceCategories(updated);
            setNewCategoryForm({ name:'', urgency:'Non-Urgent', enabled:true });
            setServiceMgmtMsg(`✓ Category "${name}" added.`);
          };
          const updateCategory = (oldName, newName, urgency) => {
            const updated = {};
            Object.entries(serviceCategories).forEach(([k, v]) => {
              updated[k === oldName ? newName.trim() : k] = k === oldName ? { ...v, urgency } : v;
            });
            saveServiceCategories(updated);
            setEditingCategory(null);
            setServiceMgmtMsg(`✓ Category updated.`);
          };
          const deleteCategory = (name) => {
            if (!window.confirm(`Delete "${name}" and ALL its services? This cannot be undone.`)) return;
            const updated = { ...serviceCategories };
            delete updated[name];
            saveServiceCategories(updated);
            setServiceMgmtMsg(`✓ Category "${name}" deleted.`);
          };
          const toggleCategory = (name) => {
            const updated = { ...serviceCategories, [name]: { ...serviceCategories[name], enabled: !serviceCategories[name].enabled } };
            saveServiceCategories(updated);
          };
          const addService = () => {
            const { category, name, priority } = newServiceForm;
            if (!category || !name.trim()) { setServiceMgmtMsg('Please fill in category and service name.'); return; }
            const cat = serviceCategories[category];
            if (cat.services.find(s => s.name.toLowerCase() === name.trim().toLowerCase())) { setServiceMgmtMsg('Service already exists in this category.'); return; }
            const updated = { ...serviceCategories, [category]: { ...cat, services: [...cat.services, { name: name.trim(), priority, enabled: true }] } };
            saveServiceCategories(updated);
            setNewServiceForm({ category, name:'', priority:'Regular' });
            setServiceMgmtMsg(`✓ Service "${name.trim()}" added.`);
          };
          const updateService = (category, index, newName, priority) => {
            const services = serviceCategories[category].services.map((s, i) => i === index ? { ...s, name: newName.trim(), priority } : s);
            const updated = { ...serviceCategories, [category]: { ...serviceCategories[category], services } };
            saveServiceCategories(updated);
            setEditingService(null);
            setServiceMgmtMsg('✓ Service updated.');
          };
          const deleteService = (category, index) => {
            const sName = serviceCategories[category].services[index]?.name;
            if (!window.confirm(`Delete service "${sName}"?`)) return;
            const services = serviceCategories[category].services.filter((_, i) => i !== index);
            const updated = { ...serviceCategories, [category]: { ...serviceCategories[category], services } };
            saveServiceCategories(updated);
            setServiceMgmtMsg(`✓ Service "${sName}" deleted.`);
          };
          const toggleService = (category, index) => {
            const services = serviceCategories[category].services.map((s, i) => i === index ? { ...s, enabled: s.enabled === false ? true : false } : s);
            const updated = { ...serviceCategories, [category]: { ...serviceCategories[category], services } };
            saveServiceCategories(updated);
          };

                    // ── Header patient search ────────────────────────────────────────────
          const handleHeaderSearch = (val) => {
            setHeaderSearch(val);
            if (!val.trim()) { setHeaderSearchResults([]); setHeaderSearchOpen(false); return; }
            const q = val.toLowerCase().trim();
            const results = registeredPatients.filter(p =>
              (p.firstName + ' ' + p.lastName).toLowerCase().includes(q) ||
              (p.lastName + ' ' + p.firstName).toLowerCase().includes(q) ||
              (p.patientId || '').toLowerCase().includes(q) ||
              (p.contactNumber || '').includes(q) ||
              (p.middleName || '').toLowerCase().includes(q)
            ).slice(0, 8);
            setHeaderSearchResults(results);
            setHeaderSearchOpen(results.length > 0);
          };

          
          // ── Contact number validator ─────────────────────────────────────────
          const validateContactNumber = (val) => {
            if (!val || !val.trim()) return { valid: true, msg: '' };
            const clean = val.trim().replace(/[\s\-]/g, '');
            if (/[a-zA-Z]/.test(clean)) return { valid: false, msg: 'Letters are not allowed.' };
            if (/^09\d+$/.test(clean)) {
              if (clean.length < 11) return { valid: false, msg: `Mobile number needs ${11 - clean.length} more digit(s). Format: 09XXXXXXXXX` };
              if (clean.length > 11) return { valid: false, msg: 'Mobile number must be exactly 11 digits. Format: 09XXXXXXXXX' };
              return { valid: true, msg: '' };
            }
            if (/^\d+$/.test(clean)) {
              if (clean.length < 7 || clean.length > 8) return { valid: false, msg: 'Landline must be 7-8 digits.' };
              return { valid: true, msg: '' };
            }
            return { valid: true, msg: '' };
          };

                    // ── Helper: calculate age from DOB string ────────────────────────────
          const calcAge = (dob) => {
            if (!dob) return null;
            const birth = new Date(dob + (dob.includes('T') ? '' : 'T00:00:00'));
            const today = new Date();
            let age = today.getFullYear() - birth.getFullYear();
            const m = today.getMonth() - birth.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
            return age;
          };
          const validateCivilStatus = (dob, status) => {
            if (!dob || !status) return true;
            const age = calcAge(dob);
            if (age !== null && age < 18 && (status === 'Married' || status === 'Separated' || status === 'Widowed')) return false;
            return true;
          };

                    // ── Audit logger — writes to backend (fire-and-forget) ──────────────
          const writeAudit = (action, details = '') => {
            // Best-effort: POST to /api/audit. Never blocks UI.
            api('POST', '/audit', {
              action,
              username: currentUser?.username || 'unknown',
              role: currentUser?.role || userRole || 'unknown',
              details
            }).catch(() => {});
          };

          // Password strength validator
          const validatePassword = (pw) => {
            if (pw.length < 8) return 'Password must be at least 8 characters.';
            if (!/[a-zA-Z]/.test(pw)) return 'Password must contain at least one letter.';
            if (!/[0-9]/.test(pw)) return 'Password must contain at least one number.';
            if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pw)) return 'Password must contain at least one special character (e.g. @, #, $).';
            return null;
          };

          // Generate OTP
          const generateOTP = () => String(Math.floor(100000 + Math.random() * 900000));

          // Send OTP step — validates form, builds pending account, shows OTP screen
          const handleSendOTP = (e) => {
            e.preventDefault();
            setRegisterError('');
            const { username, password, confirmPassword, role, firstName, middleInitial, lastName, birthday, email, mobile, contactMethod } = newAccount;
            if (!username.trim() || !password || !confirmPassword || !firstName.trim() || !lastName.trim()) {
              setRegisterError('Please fill in all required fields.');
              return;
            }
            if (!birthday) {
              setRegisterError('Date of Birth is required.');
              return;
            }
            const today = new Date();
            const dob = new Date(birthday);
            let age = today.getFullYear() - dob.getFullYear();
            const m = today.getMonth() - dob.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
            if (age < 18) {
              setRegisterError('You must be at least 18 years old to create an account.');
              return;
            }
            if (age > 85) {
              setRegisterError('Account registration is only available for individuals 85 years old and below. Please visit your barangay health clinic directly.');
              return;
            }
            if (username.trim().length < 3) {
              setRegisterError('Username must be at least 3 characters.');
              return;
            }
            const pwError = validatePassword(password);
            if (pwError) { setRegisterError(pwError); return; }
            if (password !== confirmPassword) { setRegisterError('Passwords do not match.'); return; }
            if (contactMethod === 'email') {
              if (!email.trim()) { setRegisterError('Email address is required for OTP verification.'); return; }
              if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setRegisterError('Please enter a valid email address.'); return; }
            } else {
              if (!mobile.trim()) { setRegisterError('Mobile number is required for OTP verification.'); return; }
              if (!/^(09|\+639)\d{9}$/.test(mobile.trim())) { setRegisterError('Please enter a valid PH mobile number (e.g. 09XXXXXXXXX).'); return; }
            }
            const accounts = getAccounts();
            if (accounts.find(a => a.username.toLowerCase() === username.trim().toLowerCase())) {
              setRegisterError('Username already exists. Please choose another.');
              return;
            }
            const fullName = `${firstName.trim()} ${middleInitial.trim() ? middleInitial.trim().replace('.','') + '. ' : ''}${lastName.trim()}`;
            const contact = contactMethod === 'email' ? email.trim() : mobile.trim();
            const code = generateOTP();
            setOtpCode(code);
            setOtpContact(contact);
            setOtpInput('');
            setOtpError('');
            setOtpResendCount(0);
            const safeRole = 'resident'; // Public registration is resident-only
            setPendingAccount({
              id: Date.now(),
              username: username.trim().toLowerCase(),
              _plainPassword: password,
              _firstName: firstName.trim(),
              _middleInitial: middleInitial.trim(),
              _lastName: lastName.trim(),
              role: safeRole, fullName,
              birthday: birthday,
              email: contactMethod === 'email' ? email.trim() : '',
              mobile: contactMethod === 'mobile' ? mobile.trim() : '',
              createdAt: new Date().toISOString(),
              // Personal info for patient record
              sex: newAccount.sex || '',
              civilStatus: newAccount.civilStatus || '',
              address: newAccount.address || '',
              contactNumber: newAccount.contactNumber || '',
              occupation: newAccount.occupation || '',
              emergencyContactPerson: newAccount.emergencyContactPerson || '',
              emergencyContactNumber: newAccount.emergencyContactNumber || '',
              allergies: newAccount.allergies || '',
              chronicConditions: newAccount.chronicConditions || '',
              currentMedications: newAccount.currentMedications || '',
            });
            setOtpStep(true);
          };

          // Resend OTP
          const handleResendOTP = () => {
            const code = generateOTP();
            setOtpCode(code);
            setOtpInput('');
            setOtpError('');
            setOtpResendCount(c => c + 1);
          };

          // Verify OTP and finalize account creation — POST to /api/auth/register
          const handleVerifyOTP = async () => {
            if (!otpInput.trim()) { setOtpError('Please enter the 6-digit OTP.'); return; }
            if (otpInput.trim() !== otpCode) { setOtpError('Incorrect OTP. Please try again.'); return; }
            try {
              await api('POST', '/auth/register', {
                username:  pendingAccount.username,
                password:  pendingAccount._plainPassword,
                role:      'resident',
                firstName: pendingAccount._firstName,
                middleInitial: pendingAccount._middleInitial || '',
                lastName:  pendingAccount._lastName,
                email:     pendingAccount.email || '',
                mobile:    pendingAccount.mobile || '',
                birthday:  pendingAccount.birthday || null,
                sex:       pendingAccount.sex || null,
                address:   pendingAccount.address || null,
                contactNumber: pendingAccount.contactNumber || pendingAccount.mobile || null,
                civilStatus: pendingAccount.civilStatus || null,
                occupation: pendingAccount.occupation || null,
                pwdId:     pendingAccount.pwdId || null,
                emergencyContactPerson: pendingAccount.emergencyContactPerson || null,
                emergencyContactNumber: pendingAccount.emergencyContactNumber || null,
                allergies: pendingAccount.allergies || null,
                chronicConditions: pendingAccount.chronicConditions || null,
                currentMedications: pendingAccount.currentMedications || null,
                philhealthNumber: pendingAccount.philHealthNumber || null,
              });
              // Auto-create OR update patient record with personal info
              // Only attempt if token is available (user must log in first if not)
              if (getToken()) {
              const today2 = new Date();
              const dob2 = new Date(pendingAccount.birthday);
              let autoAge = today2.getFullYear() - dob2.getFullYear();
              const mm2 = today2.getMonth() - dob2.getMonth();
              if (mm2 < 0 || (mm2 === 0 && today2.getDate() < dob2.getDate())) autoAge--;
              const patientPayload = {
                firstName: pendingAccount._firstName,
                lastName:  pendingAccount._lastName,
                middleName: pendingAccount._middleInitial ? pendingAccount._middleInitial + '.' : null,
                dateOfBirth: pendingAccount.birthday || null,
                age: autoAge,
                sex: pendingAccount.sex || null,
                civilStatus: pendingAccount.civilStatus || null,
                address: pendingAccount.address || null,
                contactNumber: pendingAccount.contactNumber || pendingAccount.mobile || null,
                occupation: pendingAccount.occupation || null,
                emergencyContactPerson: pendingAccount.emergencyContactPerson || null,
                emergencyContactNumber: pendingAccount.emergencyContactNumber || null,
                allergies: pendingAccount.allergies || null,
                chronicConditions: pendingAccount.chronicConditions || null,
                currentMedications: pendingAccount.currentMedications || null,
              };
              try {
                // Check if patient record already exists for this user
                const existingPat = registeredPatients.find(p => {
                  const fn = (p.firstName||'').toLowerCase();
                  const ln = (p.lastName||'').toLowerCase();
                  return fn === pendingAccount._firstName.toLowerCase() && ln === pendingAccount._lastName.toLowerCase();
                });
                let savedPat;
                if (existingPat) {
                  // Update existing record with the new complete info
                  const updRow = await api('PUT', '/patients/' + existingPat.patientId, patientPayload);
                  savedPat = normalizePatient(updRow);
                  setRegisteredPatients(prev => prev.map(p => p.patientId === savedPat.patientId ? savedPat : p));
                } else {
                  // Create new patient record
                  const patRow = await api('POST', '/patients', patientPayload);
                  savedPat = normalizePatient(patRow);
                  setRegisteredPatients(prev => [savedPat, ...prev]);
                }
              } catch(patErr) {
                console.warn('Patient record auto-save failed (non-fatal):', patErr.message);
              }
              } // end getToken() check
              // Show success screen first, then auto-close after 2.5 seconds
              const successUsername = pendingAccount.username;
              setRegisterSuccess(`Account created successfully! You can now log in as "${successUsername}".`);
              setNewAccount({ username:'', password:'', confirmPassword:'', role:'resident', firstName:'', middleInitial:'', lastName:'', birthday:'', email:'', mobile:'', contactMethod:'email', sex:'', civilStatus:'', address:'', contactNumber:'', occupation:'', emergencyContactPerson:'', emergencyContactNumber:'', allergies:'', chronicConditions:'', currentMedications:'' });
              setShowRegPassword(false);
              setTimeout(() => {
                setOtpStep(false);
                setPendingAccount(null);
                setOtpCode(''); setOtpInput('');
                setShowCreateAccount(false);
                setRegisterSuccess('');
              }, 2500);
            } catch(err) {
              setOtpError(err.message || 'Registration failed. Please try again.');
            }
          };

          // Cancel OTP step
          const handleCancelOTP = () => {
            setOtpStep(false);
            setPendingAccount(null);
            setOtpCode('');
            setOtpInput('');
            setOtpError('');
          };

          // ── Detect password reset token in URL hash ─────────────────────────
          React.useEffect(() => {
            const hash = window.location.hash;
            if (hash && hash.includes('access_token') && hash.includes('type=recovery')) {
              const params = new URLSearchParams(hash.replace('#', ''));
              const token = params.get('access_token');
              if (token) {
                setResetToken(token);
                setShowResetPassword(true);
                // Clean up URL
                window.history.replaceState(null, '', window.location.pathname);
              }
            }
          }, []);

          // ── Handle reset password submission ─────────────────────────────────
          const handleResetPassword = async (e) => {
            e.preventDefault();
            if (!resetForm.newPassword || !resetForm.confirmPassword) {
              setResetError('Please fill in both fields.'); return;
            }
            if (resetForm.newPassword !== resetForm.confirmPassword) {
              setResetError('Passwords do not match.'); return;
            }
            if (resetForm.newPassword.length < 8) {
              setResetError('Password must be at least 8 characters.'); return;
            }
            setResetLoading(true); setResetError('');
            try {
              const res = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accessToken: resetToken, newPassword: resetForm.newPassword })
              });
              const data = await res.json();
              if (!res.ok) { setResetError(data.error || 'Failed to reset password.'); }
              else {
                setResetSuccess('Password reset successfully! You can now log in with your new password.');
                setResetForm({ newPassword:'', confirmPassword:'' });
                setTimeout(() => { setShowResetPassword(false); setResetSuccess(''); setResetToken(''); }, 3000);
              }
            } catch { setResetError('Network error. Please try again.'); }
            finally { setResetLoading(false); }
          };

                    // ── Close settings menu on outside click ───────────────────────────
          React.useEffect(() => {
            const close = () => { setShowSettingsMenu(false); setHeaderSearchOpen(false); };
            if (showSettingsMenu || headerSearchOpen) document.addEventListener('click', close);
            return () => document.removeEventListener('click', close);
          }, [showSettingsMenu, headerSearchOpen]);

          // Handle Create Account (alias kept for form onSubmit)
          const handleCreateAccount = handleSendOTP;

          // Handle Logout — clear JWT + all state
          const handleLogout = () => {
            setShowIdleWarning(false);
            // Send LOGOUT audit BEFORE clearing token — avoids 401 race condition
            const logoutUser = currentUser;
            const logoutToken = getToken();
            if (logoutToken && logoutUser) {
              fetch(API_BASE_URL + '/audit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${logoutToken}` },
                body: JSON.stringify({ action: 'LOGOUT', username: logoutUser.username, role: logoutUser.role, details: `${logoutUser.username} logged out` })
              }).catch(() => {});
            }
            setToken(null);
            try { sessionStorage.removeItem('ht_user'); } catch {}
            setUserRole(''); setCurrentUser(null);
            setRegisteredPatients([]); setQueue([]); setVisitLog([]); setUsers([]);
            setLoginUsername(''); setLoginPassword(''); setLoginError('');
            setShowCreateAccount(false); setShowPassword(false);
          };

          // ── Clinic Appointment Slots (1-hour, 8 AM–5 PM, lunch 12–1 PM blocked) ──
          const CLINIC_SLOTS = [
            { value: '08:00', label: '8:00 AM – 9:00 AM',   slot: 1 },
            { value: '09:00', label: '9:00 AM – 10:00 AM',  slot: 2 },
            { value: '10:00', label: '10:00 AM – 11:00 AM', slot: 3 },
            { value: '11:00', label: '11:00 AM – 12:00 PM', slot: 4 },
            { value: '12:00', label: '12:00 PM – 1:00 PM',  slot: 5, lunch: true },
            { value: '13:00', label: '1:00 PM – 2:00 PM',   slot: 6 },
            { value: '14:00', label: '2:00 PM – 3:00 PM',   slot: 7 },
            { value: '15:00', label: '3:00 PM – 4:00 PM',   slot: 8 },
            { value: '16:00', label: '4:00 PM – 5:00 PM',   slot: 9 },
          ];

          // Returns Set of booked time-values for a given date (excluding an optional appointment id)
          // ── Doctors State ────────────────────────────────────────────────────
          const [doctors, setDoctors] = React.useState(() => {
            try { 
              const s = localStorage.getItem('ht_doctors'); 
              const saved = s ? JSON.parse(s) : null;
              // Reset if saved version is old (missing weekday schedules)
              if (saved && saved[0] && saved[0].schedules && saved[0].schedules.length <= 3) {
                localStorage.removeItem('ht_doctors');
                return DEFAULT_DOCTORS;
              }
              return saved || DEFAULT_DOCTORS; 
            } catch { return DEFAULT_DOCTORS; }
          });
          const saveDoctors = (updated) => { setDoctors(updated); try { localStorage.setItem('ht_doctors', JSON.stringify(updated)); } catch {} };

          // ── Doctor Management States ──────────────────────────────────────────
          const [showDoctorMgmt, setShowDoctorMgmt] = useState(false);
          const [doctorForm, setDoctorForm] = useState({ id:'', name:'', specialty:'General Physician', schedules:[], enabled:true });
          const [editingDoctorId, setEditingDoctorId] = useState(null);
          const [doctorMsg, setDoctorMsg] = useState('');

          // ── Helper: is doctor available today ───────────────────────────────
          const isDoctorAvailableToday = (doctor) => {
            if (!doctor.enabled) return false;
            const today = new Date().toLocaleDateString('en-US', {weekday:'long'});
            return doctor.schedules.some(s => s.day === today);
          };
          const getDoctorScheduleDisplay = (doctor) => {
            if (!doctor.schedules || doctor.schedules.length === 0) return 'No schedule set';
            const days = doctor.schedules.map(s => s.day.slice(0,3)).join(', ');
            const first = doctor.schedules[0];
            return `${days} · ${first.start} - ${first.end}`;
          };

                    // ── Service Management State (admin-configurable) ───────────────
          const [serviceCategories, setServiceCategories] = React.useState(() => {
            try {
              const saved = localStorage.getItem('ht_service_categories');
              return saved ? JSON.parse(saved) : DEFAULT_SERVICE_CATEGORIES;
            } catch { return DEFAULT_SERVICE_CATEGORIES; }
          });
          const [slotCapacity, setSlotCapacity] = React.useState(() => {
            try { return parseInt(localStorage.getItem('ht_slot_capacity') || '38'); } catch { return 38; }
          });
          const SERVICE_CATEGORIES = serviceCategories;
          const SLOT_CAPACITY = slotCapacity;

          // Returns a Set of time slots that are FULL (at or over capacity)
          const getBookedSlots = (date, excludeId = null) => {
            if (!date) return new Set();
            const counts = {};
            queue
              .filter(q => q.appointmentDate === date && q.id !== excludeId && !['Cancelled','Rejected'].includes(q.status))
              .forEach(q => {
                if (q.appointmentTime) counts[q.appointmentTime] = (counts[q.appointmentTime] || 0) + 1;
              });
            return new Set(Object.entries(counts).filter(([, c]) => c >= SLOT_CAPACITY).map(([t]) => t));
          };

          // Returns count of bookings for a specific slot
          const getSlotCount = (date, time) => {
            if (!date || !time) return 0;
            return queue.filter(q =>
              q.appointmentDate === date && q.appointmentTime === time &&
              !['Cancelled','Rejected'].includes(q.status)
            ).length;
          };

          // Data States
          const [registeredPatients, setRegisteredPatients] = useState([]);
          const [queue, setQueue] = useState([]);
          const [visitLog, setVisitLog] = useState([]);
          const [users, setUsers] = useState([]);        // admin account management
          const [loadingData, setLoadingData] = useState(false);
          const [syncStatus, setSyncStatus] = useState(''); // 'syncing'|'ok'|'error'
          
          // UI States
          const [showRegisterPatient, setShowRegisterPatient] = useState(false);
          const [showAddToQueue, setShowAddToQueue] = useState(false);
          const [selectedPatient, setSelectedPatient] = useState(null);
          const [headerSearch, setHeaderSearch] = useState('');
          const [headerSearchOpen, setHeaderSearchOpen] = useState(false);
          const [headerSearchResults, setHeaderSearchResults] = useState([]);
          const [searchTerm, setSearchTerm] = useState('');
          const [editingPatient, setEditingPatient] = useState(null);
          
          // Analytics States
          const [analyticsTimeRange, setAnalyticsTimeRange] = useState('daily');

          // ── Session inactivity timer ─────────────────────────────────────
          React.useEffect(() => {
            if (!userRole) return; // only when logged in
            const resetActivity = () => setLastActivity(Date.now());
            const events = ['mousemove','keydown','click','scroll','touchstart'];
            events.forEach(e => window.addEventListener(e, resetActivity, { passive: true }));
            return () => events.forEach(e => window.removeEventListener(e, resetActivity));
          }, [userRole]);

          React.useEffect(() => {
            if (!userRole) return;
            const interval = setInterval(() => {
              const idle = Date.now() - lastActivity;
              if (idle >= SESSION_TIMEOUT_MS) {
                // Force logout
                setUserRole('');
                setCurrentUser(null);
                setLoginError('You were logged out due to inactivity.');
                setShowIdleWarning(false);
              } else if (idle >= SESSION_TIMEOUT_MS - SESSION_WARNING_MS) {
                const remaining = Math.ceil((SESSION_TIMEOUT_MS - idle) / 1000);
                setIdleCountdown(remaining);
                setShowIdleWarning(true);
              } else {
                setShowIdleWarning(false);
              }
            }, 1000);
            return () => clearInterval(interval);
          }, [userRole, lastActivity]);

          // ── Lockout countdown timer ──────────────────────────────────────
          React.useEffect(() => {
            if (!lockoutUntil) return;
            const interval = setInterval(() => {
              const remaining = Math.ceil((lockoutUntil - Date.now()) / 1000);
              if (remaining <= 0) {
                setLockoutUntil(null);
                setLoginError('');
                setLockoutCountdown(0);
              } else {
                setLockoutCountdown(remaining);
                setLoginError(`Account locked. Try again in ${Math.floor(remaining/60)}:${String(remaining%60).padStart(2,'0')}.`);
              }
            }, 1000);
            return () => clearInterval(interval);
          }, [lockoutUntil]);
          // ── Session restore on page reload (token was in sessionStorage) ──────
          useEffect(() => {
            const savedToken = getToken();
            const savedUser = (() => { try { return JSON.parse(sessionStorage.getItem('ht_user')||'null'); } catch { return null; } })();
            if (!savedToken || !savedUser) return;
            api('GET', '/auth/verify').then(data => {
              if (data.valid) {
                setCurrentUser(savedUser);
                setUserRole(savedUser.role);
                if (savedUser.role === 'resident') setResidentView('queue');
                else setActiveTab('dashboard');
                setLastActivity(Date.now());
              } else {
                setToken(null);
              }
            }).catch(() => setToken(null));
          }, []);

          const [showAdminAddAccount, setShowAdminAddAccount] = useState(false);
          const [adminNewAccount, setAdminNewAccount] = useState({ username: '', password: '', confirmPassword: '', role: 'staff', firstName: '', middleInitial: '', lastName: '', email: '' });
          const [adminAccountError, setAdminAccountError] = useState('');
          const [adminAccountSuccess, setAdminAccountSuccess] = useState('');
          const [deleteAccountTarget, setDeleteAccountTarget] = useState(null);
          const [deleteAccountError, setDeleteAccountError] = useState('');

          const handleDeleteAccount = async () => {
            if (!deleteAccountTarget) return;
            if (deleteAccountTarget.username === currentUser?.username) {
              setDeleteAccountError('You cannot delete your own account while logged in.');
              return;
            }
            try {
              await api('DELETE', '/auth/users/' + deleteAccountTarget.userId);
              setUsers(prev => prev.filter(u => u.id !== deleteAccountTarget.id));
              writeAudit('DELETE_USER', `Deleted account: @${deleteAccountTarget.username}`);
              setDeleteAccountTarget(null); setDeleteAccountError('');
            } catch(err) {
              setDeleteAccountError(err.message || 'Failed to delete account.');
            }
          };
          const [analyticsServiceFilter, setAnalyticsServiceFilter] = useState('all');
          
          // Resident Portal States
          const [residentView, setResidentView] = useState('queue'); // 'queue', 'history', 'booking', 'appointments'
          const [residentPatientId, setResidentPatientId] = useState('');
          const [residentBooking, setResidentBooking] = useState({
            lastName: '', firstName: '', middleName: '',
            dateOfBirth: '', sex: '', civilStatus: '',
            address: '', contactNumber: '', occupation: '',
            emergencyContactPerson: '', emergencyContactNumber: '',
            philHealthNumber: '', allergies: '', chronicConditions: '', currentMedications: '',
            appointmentDate: '', appointmentTime: '',
            serviceCategory: '', serviceType: '', priorityLevel: '', notes: ''
          });
          const [bookingFor, setBookingFor] = useState('myself'); // 'myself' | 'someone'

          // Appointment Management States
          const [editingAppointment, setEditingAppointment] = useState(null);
          const [editMode, setEditMode] = useState(''); // 'edit', 'reschedule'
          const [showCancelConfirm, setShowCancelConfirm] = useState(null);
          const [appointmentSearch, setAppointmentSearch] = useState('');
          const [queueSearch, setQueueSearch] = useState('');
          const [queueStatusFilter, setQueueStatusFilter] = useState('all'); // all | Waiting | Accepted | In Progress | Completed
          // ── Detect new bookings for admin/staff notification ──────────────
          const seenBookingIds = React.useRef(null); // null = not initialized yet
          useEffect(() => {
            if (!userRole || (userRole !== 'admin' && userRole !== 'staff')) return;
            if (queue.length === 0) return;

            // Get all self-booked waiting entries
            const waitingEntries = queue.filter(q => q.status === 'Waiting' && q.selfBooked);

            // First run — just seed the set, don't notify
            if (seenBookingIds.current === null) {
              seenBookingIds.current = new Set(waitingEntries.map(q => q.id || q.queueId));
              return;
            }

            // Find entries not seen before
            waitingEntries.forEach(entry => {
              const id = entry.id || entry.queueId;
              if (!seenBookingIds.current.has(id)) {
                seenBookingIds.current.add(id);
                const name = entry.name || 'A patient';
                const service = entry.serviceCategory || entry.service || 'a service';
                const notif = {
                  id: Date.now() + Math.random(),
                  title: '🔔 New Booking Request',
                  message: `${name} submitted a booking for ${service}. Please review and accept.`,
                  type: 'info',
                  timestamp: new Date().toISOString(),
                  read: false
                };
                setNotifications(prev => [notif, ...prev]);
              }
            });
          }, [queue.length, userRole]);

          // ── Data loading helpers ──────────────────────────────────────────
          const loadPatients = async () => {
            try {
              const rows = await api('GET', '/patients');
              setRegisteredPatients(rows.map(normalizePatient));
            } catch(e) { console.error('loadPatients:', e.message); }
          };

          const loadQueue = async () => {
            try {
              const rows = await api('GET', '/queue');
              setQueue(rows.map(normalizeQueue));
            } catch(e) { console.error('loadQueue:', e.message); }
          };

          const loadVisitLog = async () => {
            try {
              const rows = await api('GET', '/visit-log');
              setVisitLog(rows.map(normalizeVisit));
            } catch(e) { console.error('loadVisitLog:', e.message); }
          };

          const loadUsers = async () => {
            try {
              const data = await api('GET', '/auth/users');
              setUsers((data.users || []).map(normalizeUser));
            } catch(e) { console.error('loadUsers:', e.message); }
          };

          // ── Initial load: session restore + data fetch on login ──────────
          useEffect(() => {
            if (!userRole) return;
            setLoadingData(true);
            const tasks = [loadPatients(), loadQueue(), loadVisitLog()];
            if (userRole === 'admin') tasks.push(loadUsers());
            if (userRole === 'resident') tasks.push(loadNotifications());
            Promise.all(tasks).finally(() => setLoadingData(false));
          }, [userRole]);

          // ── Real-time polling: queue every 3 s, full refresh every 30 s ──
          const prevQueueLengthRef = React.useRef(0);
          useEffect(() => {
            if (!userRole) return;
            const queueTimer = setInterval(async () => {
              await loadQueue();
            }, 3000);
            const fullTimer = setInterval(() => {
              loadPatients();
              loadVisitLog();
              if (userRole === 'admin') loadUsers();
            }, 30000);
            const notifTimer = setInterval(() => {
              if (userRole === 'resident') loadNotifications();
            }, 10000);
            return () => { clearInterval(queueTimer); clearInterval(fullTimer); clearInterval(notifTimer); };
          }, [userRole]);

          // Initial state for new patient registration
          const [newPatient, setNewPatient] = useState({
            lastName: '',
            firstName: '',
            middleName: '',
            dateOfBirth: '',
            sex: '',
            address: '',
            contact: '',
            civilStatus: '',
            occupation: '',
            philHealthNumber: '',
            emergencyContactPerson: '',
            emergencyContactNumber: '',
            allergies: '',
            chronicConditions: '',
            currentMedications: '',
            // Queue fields — if addToQueueNow is true
            addToQueueNow: false,
            queueServiceCategory: '',
            queueServiceType: '',
            queuePriority: 'Regular',
            queueReason: '',
          });

          // State for adding registered patient to queue
          const [queuePatient, setQueuePatient] = useState({
            patientId: '',
            serviceCategory: '',
            serviceType: '',
            priority: 'Regular',
            chiefComplaint: ''
          });
          const [walkInType, setWalkInType] = useState('registered'); // 'registered' | 'new'
          const [walkInNewPatient, setWalkInNewPatient] = useState({
            firstName: '', lastName: '', middleName: '',
            dateOfBirth: '', sex: '', contactNumber: '', address: ''
          });

          const priorityLevels = {
            'Priority Case': { color: 'bg-red-500', textColor: 'text-red-700', bgLight: 'bg-red-50', border: 'border-red-200', weight: 1 },
            Urgent: { color: 'bg-orange-500', textColor: 'text-orange-700', bgLight: 'bg-orange-50', border: 'border-orange-200', weight: 2 },
            Regular: { color: 'bg-green-500', textColor: 'text-green-700', bgLight: 'bg-green-50', border: 'border-green-200', weight: 3 }
          };

          // Generate unique Patient ID
          const generatePatientId = () => {
            const year = new Date().getFullYear();
            const sequence = (registeredPatients.length + 1).toString().padStart(4, '0');
            return `PT-${year}-${sequence}`;
          };

          // Calculate age from date of birth
          const calculateAge = (dateOfBirth) => {
            const today = new Date();
            const birthDate = new Date(dateOfBirth);
            let age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
              age--;
            }
            return age;
          };

          // Register new patient — POST to /api/patients
          const registerPatient = async () => {
            if (!newPatient.lastName || !newPatient.firstName || !newPatient.dateOfBirth || !newPatient.sex || !newPatient.address || !newPatient.contact) {
              alert('Please fill in all required fields (marked with *)');
              return;
            }
            if (/[a-zA-Z]/.test(newPatient.contact)) {
              alert('Contact Number must contain digits only — no letters allowed.');
              return;
            }
            if (newPatient.emergencyContactNumber && /[a-zA-Z]/.test(newPatient.emergencyContactNumber)) {
              alert('Emergency Contact Number must contain digits only — no letters allowed.');
              return;
            }
            try {
              const row = await api('POST', '/patients', {
                lastName: newPatient.lastName, firstName: newPatient.firstName,
                middleName: newPatient.middleName || null,
                dateOfBirth: newPatient.dateOfBirth,
                age: calculateAge(newPatient.dateOfBirth),
                sex: newPatient.sex, address: newPatient.address,
                contactNumber: newPatient.contact,
                civilStatus: newPatient.civilStatus || null,
                occupation: newPatient.occupation || null,
                philhealthNumber: newPatient.philHealthNumber || null,
                pwdId: newPatient.pwdId || null,
                emergencyContactPerson: newPatient.emergencyContactPerson || null,
                emergencyContactNumber: newPatient.emergencyContactNumber || null,
                allergies: newPatient.allergies || null,
                chronicConditions: newPatient.chronicConditions || null,
                currentMedications: newPatient.currentMedications || null,
              });
              const patient = normalizePatient(row);
              setRegisteredPatients(prev => [patient, ...prev]);

              // If "Add to Queue Now" is checked, also queue the patient
              if (newPatient.addToQueueNow && newPatient.queueServiceCategory && newPatient.queueServiceType && newPatient.queueReason) {
                try {
                  // Auto-priority: PWD → Priority Case, Senior (60+) → Urgent
                  const patAge = patient.age || (patient.dateOfBirth
                    ? Math.floor((Date.now() - new Date(patient.dateOfBirth)) / 31557600000) : 0);
                  const priority = patient.pwdId || newPatient.pwdId
                    ? 'Priority Case'
                    : patAge >= 60
                    ? 'Urgent'
                    : newPatient.queuePriority ||
                      SERVICE_CATEGORIES[newPatient.queueServiceCategory]?.services
                        .find(s => s.name === newPatient.queueServiceType)?.priority || 'Regular';
                  const qRow = await api('POST', '/queue', {
                    patientId: patient.patientId,
                    serviceCategory: newPatient.queueServiceCategory,
                    serviceName: newPatient.queueServiceType,
                    priority,
                    chiefComplaint: newPatient.queueReason,
                    selfBooked: false,
                  });
                  const qEntry = normalizeQueue(qRow);
                  setQueue(prev => [...prev, qEntry].sort((a,b) => priorityLevels[a.priority].weight - priorityLevels[b.priority].weight));
                  writeAudit('ADD_QUEUE', `Walk-in queued: ${patient.firstName} ${patient.lastName} (${patient.patientId})`);
                  alert(`✅ Patient registered and added to queue!\n\nPatient ID: ${patient.patientId}\nQueue #: ${qEntry.queueNumber}\nService: ${newPatient.queueServiceType}`);
                } catch(qErr) {
                  alert(`Patient registered (ID: ${patient.patientId}) but could not add to queue: ${qErr.message}`);
                }
              } else {
                alert('Patient registered successfully!\nPatient ID: ' + patient.patientId);
              }

              setNewPatient({ lastName:'', firstName:'', middleName:'', dateOfBirth:'', sex:'', address:'', contact:'', civilStatus:'', occupation:'', pwdId:'', philHealthNumber:'', emergencyContactPerson:'', emergencyContactNumber:'', allergies:'', chronicConditions:'', currentMedications:'', addToQueueNow:false, queueServiceCategory:'', queueServiceType:'', queuePriority:'Regular', queueReason:'' });
              setShowRegisterPatient(false);
              setActiveTab('patients');
            } catch(err) {
              alert('Registration failed: ' + (err.message || 'Unknown error'));
            }
          };

          // Add registered patient to queue — POST /api/queue
          const addToQueue = async () => {
            // For new walk-in: create patient record first
            if (walkInType === 'new') {
              if (!walkInNewPatient.firstName.trim() || !walkInNewPatient.lastName.trim() || !walkInNewPatient.sex) {
                alert('Please enter at least First Name, Last Name, and Sex for the walk-in patient.'); return;
              }
              if (!queuePatient.serviceCategory || !queuePatient.serviceType || !queuePatient.chiefComplaint) {
                alert('Please fill in all required fields.'); return;
              }
              try {
                const today = new Date();
                const dob = walkInNewPatient.dateOfBirth ? new Date(walkInNewPatient.dateOfBirth + 'T00:00:00') : null;
                let age = null;
                if (dob) {
                  age = today.getFullYear() - dob.getFullYear();
                  if (today.getMonth() < dob.getMonth() || (today.getMonth() === dob.getMonth() && today.getDate() < dob.getDate())) age--;
                }
                const patRow = await api('POST', '/patients', {
                  firstName: walkInNewPatient.firstName.trim(),
                  lastName:  walkInNewPatient.lastName.trim(),
                  middleName: walkInNewPatient.middleName.trim() || null,
                  dateOfBirth: walkInNewPatient.dateOfBirth || null,
                  age, sex: walkInNewPatient.sex,
                  contactNumber: walkInNewPatient.contactNumber.trim() || null,
                  address: walkInNewPatient.address.trim() || null,
                });
                const newPat = normalizePatient(patRow);
                setRegisteredPatients(prev => [newPat, ...prev]);
                setQueuePatient(q => ({ ...q, patientId: newPat.patientId }));
                // Continue with this new patientId
                const priority = queuePatient.priority ||
                  SERVICE_CATEGORIES[queuePatient.serviceCategory]?.services
                    .find(s => s.name === queuePatient.serviceType)?.priority || 'Regular';
                const qRow = await api('POST', '/queue', {
                  patientId: newPat.patientId,
                  serviceCategory: queuePatient.serviceCategory,
                  serviceName: queuePatient.serviceType,
                  priority,
                  chiefComplaint: queuePatient.chiefComplaint,
                  selfBooked: false,
                });
                const entry = normalizeQueue(qRow);
                setQueue(prev => [...prev, entry].sort((a,b) => priorityLevels[a.priority].weight - priorityLevels[b.priority].weight));
                writeAudit('ADD_QUEUE', `Walk-in: ${newPat.firstName} ${newPat.lastName} (${newPat.patientId})`);
                setQueuePatient({ patientId:'', serviceCategory:'', serviceType:'', priority:'Regular', chiefComplaint:'' });
                setWalkInNewPatient({ firstName:'', lastName:'', middleName:'', dateOfBirth:'', sex:'', contactNumber:'', address:'' });
                setWalkInType('registered');
                setShowAddToQueue(false);
                alert(`✅ Walk-in patient added!\n\nPatient ID: ${newPat.patientId}\nName: ${newPat.firstName} ${newPat.lastName}\nQueue #: ${entry.queueNumber}`);
              } catch(err) {
                alert('Failed to add walk-in patient: ' + (err.message || 'Unknown error'));
              }
              return;
            }
            if (!queuePatient.patientId || !queuePatient.serviceCategory || !queuePatient.serviceType || !queuePatient.chiefComplaint) {
              alert('Please select a patient, service category, service type, and enter chief complaint');
              return;
            }
            // Handle unregistered walk-in — create a placeholder patient record
            let patient = registeredPatients.find(p => p.patientId === queuePatient.patientId);
            if (queuePatient.patientId === 'WALKIN_UNREGISTERED') {
              try {
                const patRow = await api('POST', '/patients', {
                  firstName: 'Walk-in', lastName: 'Patient', sex: 'Unknown',
                  address: 'To be updated', age: null, dateOfBirth: null,
                });
                patient = normalizePatient(patRow);
                setRegisteredPatients(prev => [patient, ...prev]);
                setQueuePatient(q => ({...q, patientId: patient.patientId}));
              } catch(e) { alert('Failed to create walk-in record: ' + (e.message || 'Error')); return; }
            }
            if (!patient) { alert('Patient not found'); return; }
            const alreadyInQueue = queue.find(q =>
              q.patientId === queuePatient.patientId &&
              !['Completed','Cancelled','Rejected'].includes(q.status)
            );
            if (alreadyInQueue) {
              alert(`${patient.firstName} ${patient.lastName} is already in the queue (#${alreadyInQueue.queueNumber}). Please serve or remove the existing entry first.`);
              return;
            }
            const priority = queuePatient.priority ||
              SERVICE_CATEGORIES[queuePatient.serviceCategory]?.services
                .find(s => s.name === queuePatient.serviceType)?.priority || 'Regular';
            try {
              const row = await api('POST', '/queue', {
                patientId: patient.patientId,
                serviceCategory: queuePatient.serviceCategory,
                serviceName: queuePatient.serviceType,
                priority,
                chiefComplaint: queuePatient.chiefComplaint,
                selfBooked: false,
                bookedByUsername: currentUser?.username || null,
              });
              const entry = normalizeQueue(row);
              setQueue(prev => [...prev, entry].sort((a,b) => priorityLevels[a.priority].weight - priorityLevels[b.priority].weight));
              setQueuePatient({ patientId:'', serviceCategory:'', serviceType:'', priority:'Regular', chiefComplaint:'' });
              setShowAddToQueue(false);
              alert(`${patient.firstName} ${patient.lastName} added to queue with ${priority} priority`);
            } catch(err) {
              alert('Failed to add to queue: ' + (err.message || 'Unknown error'));
            }
          };

          // ── Serve modal state ──
          const [serveModalTarget, setServeModalTarget] = useState(null);
          const [serveForm, setServeForm] = useState({ diagnosis: '', treatment: '', prescription: '', notes: '' });
          const [serveError, setServeError] = useState('');

          // Open serve modal instead of direct serve
          const markAsServed = (queueItem) => {
            setServeModalTarget(queueItem);
            setServeForm({ diagnosis: '', treatment: '', prescription: '', notes: '' });
            setServeError('');
          };

          // Confirm serve — POST /api/queue/:id/complete (creates visit log on backend)
          const confirmServe = async () => {
            if (!serveForm.diagnosis.trim()) {
              setServeError('Diagnosis is required before marking a patient as served.');
              return;
            }
            if (!serveForm.notes.trim()) {
              setServeError('Clinical notes are required before marking a patient as served.');
              return;
            }
            try {
              await api('POST', '/queue/' + serveModalTarget.queueId + '/complete', {
                diagnosis:    serveForm.diagnosis.trim(),
                treatment:    serveForm.treatment.trim() || null,
                prescription: serveForm.prescription.trim() || null,
                notes:        serveForm.notes.trim(),
                attendedBy:   currentUser?.fullName || currentUser?.username || 'Staff',
              });
              // Refresh both queue and visit log from server
              await Promise.all([loadQueue(), loadVisitLog()]);
              setServeModalTarget(null); setServeError('');
              alert(`Patient "${serveModalTarget.name}" marked as served.`);
            } catch(err) {
              setServeError(err.message || 'Failed to mark as served.');
            }
          };

          // ── Notifications (in-app) ──
          const [notifications, setNotifications] = useState([]);
          const [showNotifPanel, setShowNotifPanel] = useState(false);

          const pushNotification = (patientId, title, message, type = 'info') => {
            const notif = { id: Date.now(), patientId, title, message, type, timestamp: new Date().toISOString(), read: false };
            const updated = [notif, ...notifications];
            setNotifications(updated);
          };

          // Load real notifications from backend (for residents)
          const loadNotifications = async () => {
            if (!userRole || userRole === 'admin' || userRole === 'staff') return;
            try {
              const rows = await api('GET', '/notifications');
              if (Array.isArray(rows)) {
                setNotifications(rows.map(n => ({
                  id: n.notification_id || n.id,
                  title: n.title,
                  message: n.message,
                  type: n.type,
                  timestamp: n.created_at,
                  read: n.read || false,
                })));
              }
            } catch(e) { /* non-fatal */ }
          };

          const markNotifsRead = () => {
            setNotifications(notifications.map(n => ({ ...n, read: true })));
            if (userRole === 'resident') api('PATCH', '/notifications/read').catch(() => {});
          };

          // ── Reject modal state ──
          const [rejectTarget, setRejectTarget] = useState(null);
          const [rejectReason, setRejectReason] = useState('');
          const [rejectError, setRejectError] = useState('');

          const openRejectModal = (item) => { setRejectTarget(item); setRejectReason(''); setRejectError(''); };
          const closeRejectModal = () => { setRejectTarget(null); setRejectReason(''); setRejectError(''); };

          const confirmReject = async () => {
            if (!rejectReason.trim()) { setRejectError('Please provide a reason for rejection.'); return; }
            try {
              await api('PATCH', '/queue/' + rejectTarget.queueId + '/status', {
                status: 'Rejected', rejectedReason: rejectReason.trim()
              });
              setQueue(prev => prev.map(q => q.id === rejectTarget.id
                ? { ...q, status:'Rejected', rejectedReason:rejectReason.trim(), rejectedAt:new Date().toISOString() }
                : q
              ));
              pushNotification(rejectTarget.patientId, 'Appointment Rejected',
                `Your appointment on ${rejectTarget.appointmentDate||'N/A'} has been rejected. Reason: ${rejectReason.trim()}`, 'rejected');
              closeRejectModal();
            } catch(err) { setRejectError(err.message || 'Failed to reject appointment.'); }
          };

          const acceptAppointment = async (item) => {
            try {
              await api('PATCH', '/queue/' + item.queueId + '/status', { status: 'Accepted' });
              setQueue(prev => prev.map(q => q.id === item.id ? {...q, status:'Accepted'} : q));
              pushNotification(item.patientId, 'Appointment Accepted',
                `Your appointment on ${item.appointmentDate||'N/A'} has been accepted. Please arrive on time.`, 'accepted');
            } catch(err) { alert('Failed to accept: ' + (err.message||'Error')); }
          };

          // Remove from queue — DELETE /api/queue/:id
          const removeFromQueue = async (queueItem) => {
            if (!window.confirm(`Remove ${queueItem.name} from queue?`)) return;
            try {
              await api('DELETE', '/queue/' + queueItem.queueId);
              writeAudit('QUEUE_REMOVED', `Removed: ${queueItem.name} (${queueItem.patientId})`);
              setQueue(prev => prev.filter(item => item.id !== queueItem.id));
            } catch(err) { alert('Failed to remove: ' + (err.message||'Error')); }
          };

          // Call a specific patient to the TV display (set to In Progress)
          const callToTV = async (queueItem) => {
            try {
              // Clear any currently In Progress first
              const currentlyServing = queue.find(q => q.status === 'In Progress');
              if (currentlyServing && currentlyServing.queueId !== queueItem.queueId) {
                await api('PATCH', '/queue/' + currentlyServing.queueId + '/status', { status: 'Accepted' });
              }
              await api('PATCH', '/queue/' + queueItem.queueId + '/status', { status: 'In Progress' });
              setQueue(prev => prev.map(q =>
                q.queueId === queueItem.queueId
                  ? {...q, status: 'In Progress'}
                  : q.queueId === currentlyServing?.queueId
                  ? {...q, status: 'Accepted'}
                  : q
              ));
              writeAudit('CALL_QUEUE', `Called to TV: ${queueItem.name} (#${queueItem.queueNumber})`);
            } catch(err) { alert('Failed to call patient: ' + (err.message||'Error')); }
          };

          // Call next patient in line (lowest queue number with Accepted/Waiting status)
          const callNextPatient = async () => {
            const next = queue
              .filter(q => q.status === 'Accepted' || q.status === 'Waiting')
              .sort((a, b) => a.queueNumber - b.queueNumber)[0];
            if (!next) { alert('No patients in queue to call.'); return; }
            await callToTV(next);
          };


          const updatePatient = async () => {
            if (!editingPatient) return;
            try {
              const payload = {
                lastName: editingPatient.lastName, firstName: editingPatient.firstName,
                middleName: editingPatient.middleName || null,
                dateOfBirth: editingPatient.dateOfBirth || '2000-01-01',
                age: calculateAge(editingPatient.dateOfBirth || '2000-01-01'),
                sex: editingPatient.sex || 'Male',
                address: editingPatient.address || 'To be updated',
                contactNumber: editingPatient.contact || editingPatient.contactNumber || 'N/A',
                civilStatus: editingPatient.civilStatus || null,
                occupation: editingPatient.occupation || null,
                philhealthNumber: editingPatient.philHealthNumber || null,
                emergencyContactPerson: editingPatient.emergencyContactPerson || null,
                emergencyContactNumber: editingPatient.emergencyContactNumber || null,
                allergies: editingPatient.allergies || null,
                chronicConditions: editingPatient.chronicConditions || null,
                currentMedications: editingPatient.currentMedications || null,
              };
              const row = await api('PUT', '/patients/' + editingPatient.patientId, payload);
              const updated = normalizePatient(row);
              setRegisteredPatients(prev => prev.map(p => p.patientId === updated.patientId ? updated : p));
              setEditingPatient(null);
              alert('Patient information updated successfully');
            } catch(err) {
              console.error('updatePatient error:', err);
              alert('Update failed: ' + (err.message || 'Unknown error. Check console for details.'));
            }
          };

          // Delete patient — DELETE /api/patients/:id
          const deletePatient = async (patientId) => {
            if (!window.confirm('Are you sure you want to delete this patient? This action cannot be undone.')) return;
            try {
              const patient = registeredPatients.find(p => p.id === patientId || p.patientId === patientId);
              const pid = patient?.patientId || patientId;
              await api('DELETE', '/patients/' + pid);
              writeAudit('DELETE_PATIENT', `Deleted patient: ${pid}`);
              setRegisteredPatients(prev => prev.filter(p => p.id !== patientId && p.patientId !== patientId));
              alert('Patient deleted successfully');
            } catch(err) { alert('Delete failed: ' + (err.message||'Error')); }
          };

          // ==================== ANALYTICS FUNCTIONS ====================
          const getAnalyticsData = () => {
            const now = new Date();
            let startDate, endDate;

            switch (analyticsTimeRange) {
              case 'daily':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
                break;
              case 'weekly':
                startDate = new Date(now);
                startDate.setDate(now.getDate() - 7);
                endDate = now;
                break;
              case 'monthly':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
                break;
              case 'yearly':
                startDate = new Date(now.getFullYear(), 0, 1);
                endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
                break;
              default:
                startDate = new Date(0);
                endDate = now;
            }

            let filteredVisits = visitLog.filter(v => {
              const visitDate = new Date(v.visitDate);
              return visitDate >= startDate && visitDate <= endDate;
            });

            // Apply service filter
            if (analyticsServiceFilter !== 'all') {
              filteredVisits = filteredVisits.filter(v => v.service === analyticsServiceFilter);
            }

            return filteredVisits;
          };

          const getServiceStatistics = () => {
            const data = getAnalyticsData();
            const serviceCount = {};
            const urgentCount = {};
            const nonUrgentCount = {};

            data.forEach(visit => {
              serviceCount[visit.service] = (serviceCount[visit.service] || 0) + 1;
              
              if (visit.serviceCategory === 'Urgent') {
                urgentCount[visit.service] = (urgentCount[visit.service] || 0) + 1;
              } else {
                nonUrgentCount[visit.service] = (nonUrgentCount[visit.service] || 0) + 1;
              }
            });

            return {
              total: data.length,
              byService: serviceCount,
              urgent: urgentCount,
              nonUrgent: nonUrgentCount,
              priorityCases: data.filter(v => v.priority === 'Priority Case').length,
              urgentCases: data.filter(v => v.priority === 'Urgent').length,
              regularCases: data.filter(v => v.priority === 'Regular').length
            };
          };

          // ==================== EXPORT FUNCTIONS ====================
          const exportToExcel = (data, filename) => {
            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Data");
            XLSX.writeFile(wb, `${filename}_${getLocalDateStr()}.xlsx`);
          };

          const exportPatients = () => {
            const data = registeredPatients.map(patient => ({
              'Patient ID': patient.patientId,
              'Last Name': patient.lastName,
              'First Name': patient.firstName,
              'Middle Name': patient.middleName || 'N/A',
              'Date of Birth': new Date(patient.dateOfBirth).toLocaleDateString(),
              'Age': patient.age,
              'Sex': patient.sex,
              'Address': patient.address,
              'Contact': patient.contact,
              'Civil Status': patient.civilStatus || 'N/A',
              'Occupation': patient.occupation || 'N/A',
              'PhilHealth Number': patient.philHealthNumber || 'N/A',
              'Emergency Contact Person': patient.emergencyContactPerson || 'N/A',
              'Emergency Contact Number': patient.emergencyContactNumber || 'N/A',
              'Allergies': patient.allergies || 'None',
              'Chronic Conditions': patient.chronicConditions || 'None',
              'Current Medications': patient.currentMedications || 'None',
              'Registered Date': new Date(patient.registeredDate).toLocaleDateString()
            }));
            exportToExcel(data, 'HealthTrack_Patients');
          };

          const exportVisitLog = () => {
            const data = visitLog.map(visit => ({
              'Visit Date': new Date(visit.visitDate).toLocaleDateString(),
              'Patient ID': visit.patientId,
              'Patient Name': visit.name,
              'Age': visit.age,
              'Sex': visit.sex,
              'Service': visit.service,
              'Service Category': visit.serviceCategory,
              'Priority': visit.priority,
              'Reason for Visit': visit.chiefComplaint,
              'Time Queued': new Date(visit.timeQueued).toLocaleTimeString(),
              'Time Served': new Date(visit.timeServed).toLocaleTimeString(),
              'Diagnosis': visit.diagnosis || 'N/A',
              'Treatment': visit.treatment || 'N/A',
              'Prescription': visit.prescription || 'N/A',
              'Notes': visit.notes || 'N/A'
            }));
            exportToExcel(data, 'HealthTrack_VisitLog');
          };

          const exportAnalytics = () => {
            const data = getAnalyticsData();
            const timeRangeLabel = analyticsTimeRange.charAt(0).toUpperCase() + analyticsTimeRange.slice(1);
            
            // Summary Statistics
            const summaryData = [
              { 'Section': 'SUMMARY STATISTICS', 'Value': '' },
              { 'Metric': 'Report Period', 'Value': timeRangeLabel },
              { 'Metric': 'Total Visits', 'Value': data.length },
              { 'Metric': 'Average Daily Visits', 'Value': (data.length / 7).toFixed(1) },
              { 'Metric': 'Total Appointments', 'Value': queue.filter(q => q.appointmentDate).length },
              { 'Metric': 'Registered Patients', 'Value': registeredPatients.length },
              { 'Metric': '', 'Value': '' },
            ];

            // Priority Distribution
            summaryData.push(
              { 'Section': 'PRIORITY DISTRIBUTION', 'Value': '' },
              { 'Metric': 'Priority Case (Emergency)', 'Value': data.filter(v => v.priority === 'Priority Case').length },
              { 'Metric': 'Urgent', 'Value': data.filter(v => v.priority === 'Urgent').length },
              { 'Metric': 'Regular', 'Value': data.filter(v => v.priority === 'Regular').length },
              { 'Metric': '', 'Value': '' }
            );

            // Service Category Breakdown
            summaryData.push({ 'Section': 'SERVICE CATEGORY BREAKDOWN', 'Value': '' });
            Object.keys(SERVICE_CATEGORIES).forEach(category => {
              const count = data.filter(v => v.serviceCategory === category).length;
              summaryData.push({ 'Metric': category, 'Value': count });
            });
            summaryData.push({ 'Metric': '', 'Value': '' });

            // Age Distribution
            const ageGroups = { '0-17': 0, '18-35': 0, '36-50': 0, '51-65': 0, '65+': 0 };
            registeredPatients.forEach(patient => {
              const age = patient.age;
              if (age <= 17) ageGroups['0-17']++;
              else if (age <= 35) ageGroups['18-35']++;
              else if (age <= 50) ageGroups['36-50']++;
              else if (age <= 65) ageGroups['51-65']++;
              else ageGroups['65+']++;
            });
            
            summaryData.push({ 'Section': 'AGE DISTRIBUTION', 'Value': '' });
            Object.entries(ageGroups).forEach(([group, count]) => {
              summaryData.push({ 'Metric': `Age ${group}`, 'Value': count });
            });
            summaryData.push({ 'Metric': '', 'Value': '' });

            // Daily Visits (Last 7 Days)
            summaryData.push({ 'Section': 'DAILY VISITS (LAST 7 DAYS)', 'Value': '' });
            for (let i = 6; i >= 0; i--) {
              const date = new Date();
              date.setDate(date.getDate() - i);
              const dateStr = date.toISOString().split('T')[0];
              const count = visitLog.filter(v => v.visitDate === dateStr).length;
              summaryData.push({ 
                'Metric': date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), 
                'Value': count 
              });
            }

            // Detailed Visit Log
            summaryData.push({ 'Metric': '', 'Value': '' });
            summaryData.push({ 'Section': 'DETAILED VISIT LOG', 'Value': '' });
            
            const detailedData = data.map(visit => ({
              'Date': new Date(visit.visitDate).toLocaleDateString(),
              'Patient ID': visit.patientId,
              'Patient Name': visit.name,
              'Age': visit.age,
              'Sex': visit.sex,
              'Service Category': visit.serviceCategory,
              'Service Type': visit.service,
              'Priority': visit.priority,
              'Reason for Visit': visit.chiefComplaint,
              'Time Queued': new Date(visit.timeQueued).toLocaleTimeString(),
              'Time Served': visit.timeServed ? new Date(visit.timeServed).toLocaleTimeString() : 'N/A',
              'Diagnosis': visit.diagnosis || 'N/A',
              'Treatment': visit.treatment || 'N/A'
            }));

            // Create workbook with multiple sheets
            const wb = XLSX.utils.book_new();
            
            // Summary sheet
            const summarySheet = XLSX.utils.json_to_sheet(summaryData);
            XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");
            
            // Detailed visits sheet
            if (detailedData.length > 0) {
              const detailedSheet = XLSX.utils.json_to_sheet(detailedData);
              XLSX.utils.book_append_sheet(wb, detailedSheet, "Detailed Visits");
            }
            
            XLSX.writeFile(wb, `HealthTrack_${timeRangeLabel}_Report_${getLocalDateStr()}.xlsx`);
          };

          // ==================== RESIDENT PORTAL FUNCTIONS ====================
          const submitResidentBooking = async () => {
            // If booking for myself, use patient record; if someone else, always use form data
            const myPatientRecord = (bookingFor === 'myself' && currentUser) ? (
              registeredPatients.find(p => {
                if (currentUser.username === p.patientId) return true;
                const fn = (p.firstName || '').toLowerCase().trim();
                const ln = (p.lastName || '').toLowerCase().trim();
                const full = (currentUser.fullName || '').toLowerCase().trim();
                return full.includes(fn) && full.includes(ln) && fn && ln;
              }) || {
                firstName: (currentUser.fullName || '').split(' ')[0] || currentUser.username,
                lastName: (currentUser.fullName || '').split(' ').slice(-1)[0] || '',
                _fromAccount: true
              }
            ) : null; // null = use form data (someone else)
            // Merge patient record into booking data so all fields are available
            const bookingData = myPatientRecord ? {
              ...residentBooking,
              firstName: myPatientRecord.firstName,
              lastName: myPatientRecord.lastName,
              middleName: myPatientRecord.middleName || '',
              dateOfBirth: myPatientRecord.dateOfBirth || '',
              sex: myPatientRecord.sex || '',
              address: myPatientRecord.address || '',
              contactNumber: myPatientRecord.contactNumber || '',
              civilStatus: myPatientRecord.civilStatus || '',
              occupation: myPatientRecord.occupation || '',
              emergencyContactPerson: myPatientRecord.emergencyContactPerson || '',
              emergencyContactNumber: myPatientRecord.emergencyContactNumber || '',
              allergies: myPatientRecord.allergies || '',
              chronicConditions: myPatientRecord.chronicConditions || '',
              currentMedications: myPatientRecord.currentMedications || '',
            } : { ...residentBooking };
            // Validate required fields
            if (!bookingData.appointmentDate || !bookingData.appointmentTime ||
                !bookingData.serviceCategory || !bookingData.serviceType) {
              alert('Please fill in all required appointment fields.'); return;
            }
            if (!myPatientRecord && (!residentBooking.firstName || !residentBooking.lastName ||
                !residentBooking.dateOfBirth || !residentBooking.sex ||
                !residentBooking.contactNumber || !residentBooking.address)) {
              alert('Please fill in all required personal information fields.'); return;
            }
            if (!myPatientRecord && /[a-zA-Z]/.test(residentBooking.contactNumber)) {
              alert('Contact Number must contain digits only — no letters allowed.'); return;
            }
            if (!myPatientRecord && residentBooking.emergencyContactNumber && /[a-zA-Z]/.test(residentBooking.emergencyContactNumber)) {
              alert('Emergency Contact Number must contain digits only — no letters allowed.'); return;
            }
            const selectedDate = new Date(residentBooking.appointmentDate + 'T00:00:00');
            const todayDate = new Date(); todayDate.setHours(0,0,0,0);
            if (selectedDate < todayDate) { alert('Appointment date cannot be in the past.'); return; }
            const dayOfWeek = selectedDate.getDay();
            if (dayOfWeek === 0 || dayOfWeek === 6) { alert('Clinic is open Monday to Friday only.'); return; }
            if (isPHHoliday(bookingData.appointmentDate)) {
              alert('⚠️ ' + getPHHolidayName(bookingData.appointmentDate) + ' is a Philippine public holiday. Please select another date.');
              return;
            }
            const [hours] = residentBooking.appointmentTime.split(':').map(Number);
            if (hours < 8 || hours > 16) { alert('Please select a valid clinic slot (8 AM – 4 PM).'); return; }
            if (residentBooking.appointmentTime === '12:00') { alert('12:00 PM – 1:00 PM is the lunch break.'); return; }
            const bookedSlots = getBookedSlots(residentBooking.appointmentDate);
            if (bookedSlots.has(bookingData.appointmentTime)) {
              alert('This time slot is already fully booked. Please choose another time.'); return;
            }
            // Block past time slots for today
            const isBookingToday = bookingData.appointmentDate === getLocalDateStr();
            if (isBookingToday && bookingData.appointmentTime) {
              const [slotH] = bookingData.appointmentTime.split(':').map(Number);
              const nowH = new Date().getHours();
              if (nowH >= slotH) {
                alert('⚠️ This time slot has already passed. Please select a future time slot or a different date.'); return;
              }
            }

            try {
              // Calculate age
              const today = new Date(), birthDate = new Date(bookingData.dateOfBirth);
              let age = today.getFullYear() - birthDate.getFullYear();
              const m = today.getMonth() - birthDate.getMonth();
              if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;

              // Upsert patient: use real patient record, else find by name+DOB, else create new
              let patient = (myPatientRecord && !myPatientRecord._fromAccount) ? myPatientRecord : null;
              if (!patient) {
                patient = registeredPatients.find(p =>
                  p.firstName && bookingData.firstName &&
                  p.firstName.toLowerCase() === bookingData.firstName.toLowerCase() &&
                  p.lastName.toLowerCase()  === bookingData.lastName.toLowerCase() &&
                  p.dateOfBirth === bookingData.dateOfBirth
                ) || null;
              }
              if (!patient) {
                // Create a new patient record from account data or form data
                const row = await api('POST', '/patients', {
                  lastName: bookingData.lastName || (currentUser?.fullName || '').split(' ').slice(-1)[0] || '',
                  firstName: bookingData.firstName || (currentUser?.fullName || '').split(' ')[0] || currentUser?.username || '',
                  middleName: bookingData.middleName || null,
                  dateOfBirth: bookingData.dateOfBirth || null,
                  age: isNaN(age) ? null : age,
                  sex: bookingData.sex || null,
                  address: bookingData.address || null,
                  contactNumber: bookingData.contactNumber || null,
                  civilStatus: bookingData.civilStatus || null,
                  occupation: bookingData.occupation || null,
                  emergencyContactPerson: bookingData.emergencyContactPerson || null,
                  emergencyContactNumber: bookingData.emergencyContactNumber || null,
                  allergies: bookingData.allergies || null,
                  chronicConditions: bookingData.chronicConditions || null,
                  currentMedications: bookingData.currentMedications || null,
                  pwdId: bookingData.pwdId || null,
                });
                patient = normalizePatient(row);
                setRegisteredPatients(prev => [patient, ...prev]);
              }
              if (!patient?.patientId) {
                alert('Booking failed: Could not create or find patient record. Please contact the clinic.'); return;
              }

              const priority = (() => {
                const pat = patient || registeredPatients.find(p =>
                  p.firstName?.toLowerCase() === bookingData.firstName?.toLowerCase() &&
                  p.lastName?.toLowerCase()  === bookingData.lastName?.toLowerCase()
                );
                // PWD → Priority Case (highest)
                if (pat?.pwdId || bookingData.pwdId) return 'Priority Case';
                // Senior Citizen (60+) → Urgent
                // Always compute from DOB — never trust stored age (may be wrong)
                const dob = pat?.dateOfBirth || bookingData.dateOfBirth;
                const realAge = dob ? Math.floor((Date.now() - new Date(dob)) / 31557600000) : -1;
                if (realAge >= 60) return 'Urgent';
                // Default: from service type
                return bookingData.priorityLevel ||
                  SERVICE_CATEGORIES[bookingData.serviceCategory]?.services
                    .find(s => s.name === bookingData.serviceType)?.priority || 'Regular';
              })();

              const proxyNote = bookingFor === 'someone'
                ? `[Booked by: ${currentUser?.fullName || currentUser?.username}] `
                : '';
              const qRow = await api('POST', '/queue', {
                patientId:       patient.patientId,
                serviceCategory: bookingData.serviceCategory,
                serviceName:     bookingData.serviceType,
                priority,
                chiefComplaint:  proxyNote + (bookingData.notes || 'Scheduled appointment'),
                appointmentDate: bookingData.appointmentDate,
                appointmentTime: bookingData.appointmentTime,
                selfBooked:      true,
                bookedByUsername: currentUser?.username || null,
              });
              const queueEntry = normalizeQueue(qRow);
              setQueue(prev => [...prev, queueEntry].sort((a,b) => priorityLevels[a.priority].weight - priorityLevels[b.priority].weight));

              setBookingFor('myself');
              setResidentBooking({ lastName:'', firstName:'', middleName:'', dateOfBirth:'', sex:'', civilStatus:'', address:'', contactNumber:'', occupation:'', pwdId:'', emergencyContactPerson:'', emergencyContactNumber:'', philHealthNumber:'', allergies:'', chronicConditions:'', currentMedications:'', appointmentDate:'', appointmentTime:'', serviceCategory:'', serviceType:'', priorityLevel:'', notes:'' });
              const forWhom = bookingFor === 'someone' ? `${bookingData.firstName} ${bookingData.lastName}` : (currentUser?.fullName || currentUser?.username);
              alert(`Booking confirmed for ${forWhom}!\n\nDate: ${bookingData.appointmentDate} at ${bookingData.appointmentTime}\nPatient ID: ${patient.patientId}\nQueue #: ${queueEntry.queueNumber}`);
              setResidentView('appointments');
            } catch(err) {
              alert('Booking failed: ' + (err.message || 'Unknown error'));
            }
          };

          const getResidentVisitHistory = () => {
            // Match visits by: patientId match, bookedByUsername, or name match
            return visitLog.filter(v => {
              if (residentPatientId && v.patientId === residentPatientId) return true;
              if (v.bookedByUsername && currentUser?.username && v.bookedByUsername === currentUser.username) return true;
              // Also match by name
              const fn = (currentUser?.fullName || '').toLowerCase().trim();
              const vName = (v.name || '').toLowerCase().trim();
              if (fn && vName && fn.includes(vName.split(' ')[0]) && fn.includes(vName.split(' ').slice(-1)[0])) return true;
              return false;
            }).sort((a, b) => new Date(b.visitDate) - new Date(a.visitDate));
          };

          // ==================== APPOINTMENT MANAGEMENT FUNCTIONS ====================
          
          // Get resident's own appointments from queue — filtered strictly by logged-in user
          const getMyAppointments = () => {
            return queue.filter(item => {
              if (!item.selfBooked) return false;
              // Privacy: only show entries booked by this logged-in user
              if (item.bookedByUsername && currentUser?.username &&
                  item.bookedByUsername !== currentUser.username) return false;
              // Fallback: match by fullName if bookedByUsername not set (legacy entries)
              if (!item.bookedByUsername && currentUser?.fullName &&
                  item.name && item.name.toLowerCase() !== currentUser.fullName.toLowerCase()) return false;
              // Filter by search term if provided
              if (appointmentSearch) {
                const searchLower = appointmentSearch.toLowerCase();
                return (
                  (item.patientId && item.patientId.toLowerCase().includes(searchLower)) ||
                  (item.service && item.service.toLowerCase().includes(searchLower)) ||
                  (item.appointmentDate && item.appointmentDate.includes(searchLower))
                );
              }
              return true;
            }).sort((a, b) => new Date(b.timeQueued) - new Date(a.timeQueued));
          };

          // Open edit modal for an appointment
          const openEditAppointment = (appointment, mode) => {
            setEditingAppointment({
              ...appointment,
              newServiceCategory: appointment.serviceCategory || '',
              newServiceType: appointment.service || '',
              newPriorityLevel: appointment.priority || '',
              newAppointmentDate: appointment.appointmentDate || '',
              newAppointmentTime: appointment.appointmentTime || '',
              newNotes: appointment.chiefComplaint || ''
            });
            setEditMode(mode);
          };

          // Save edited appointment — PUT /api/queue/:id
          const saveEditedAppointment = async () => {
            if (!editingAppointment) return;

            if (editMode === 'reschedule') {
              if (!editingAppointment.newAppointmentDate || !editingAppointment.newAppointmentTime) {
                alert('Please select a new date and time for rescheduling.');
                return;
              }
            }

            if (editMode === 'edit') {
              if (!editingAppointment.newServiceCategory || !editingAppointment.newServiceType) {
                alert('Please select a service category and type.');
                return;
              }
            }

            try {
              await api('PUT', '/queue/' + editingAppointment.queueId, {
                serviceCategory: editingAppointment.newServiceCategory || editingAppointment.serviceCategory,
                serviceName:     editingAppointment.newServiceType     || editingAppointment.service,
                priority:        editingAppointment.newPriorityLevel   || editingAppointment.priority,
                chiefComplaint:  editingAppointment.newNotes           || editingAppointment.chiefComplaint,
                appointmentDate: editingAppointment.newAppointmentDate || editingAppointment.appointmentDate,
                appointmentTime: editingAppointment.newAppointmentTime || editingAppointment.appointmentTime,
              });
              await loadQueue();
              setEditingAppointment(null); setEditMode('');
              alert(editMode === 'reschedule'
                ? `Appointment rescheduled to ${editingAppointment.newAppointmentDate} at ${editingAppointment.newAppointmentTime}.`
                : 'Appointment updated successfully.');
            } catch(err) { alert('Update failed: ' + (err.message||'Error')); }
          };

          // Cancel an appointment — PATCH /api/queue/:id/status
          const cancelAppointment = async (appointmentId) => {
            const item = queue.find(q => q.id === appointmentId);
            if (!item) return;
            try {
              await api('PATCH', '/queue/' + item.queueId + '/status', { status: 'Cancelled' });
              setQueue(prev => prev.map(q => q.id === appointmentId
                ? {...q, status:'Cancelled', cancelledAt:new Date().toISOString()} : q));
              setShowCancelConfirm(null);
              alert('Appointment cancelled successfully.');
            } catch(err) { alert('Cancel failed: ' + (err.message||'Error')); }
          };

          // ==================== RENDER: LOGIN SCREEN ====================
          if (!userRole) {
            return (
              <div className="min-h-screen flex items-center justify-center p-4" style={{background: 'linear-gradient(135deg, #fff0f0 0%, #ffffff 50%, #ffe5e5 100%)'}}>

                {/* ===== RESET PASSWORD MODAL (from email link) ===== */}
                {showResetPassword && (
                  <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                      <div className="text-center mb-5">
                        <div className="text-5xl mb-3">🔐</div>
                        <h2 className="text-xl font-bold text-gray-800">Set New Password</h2>
                        <p className="text-sm text-gray-500 mt-1">Enter your new password below</p>
                      </div>
                      {resetSuccess ? (
                        <div className="text-center py-4">
                          <div className="text-4xl mb-3">✅</div>
                          <p className="text-green-700 font-semibold mb-2">{resetSuccess}</p>
                          <p className="text-sm text-gray-500">Redirecting to login...</p>
                        </div>
                      ) : (
                        <form onSubmit={handleResetPassword} className="space-y-4">
                          {resetError && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{resetError}</div>}
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">New Password</label>
                            <input type="password" value={resetForm.newPassword}
                              onChange={e => setResetForm(f=>({...f,newPassword:e.target.value}))}
                              placeholder="Min 8 characters"
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-400 focus:border-transparent" required />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Confirm New Password</label>
                            <input type="password" value={resetForm.confirmPassword}
                              onChange={e => setResetForm(f=>({...f,confirmPassword:e.target.value}))}
                              placeholder="Re-enter new password"
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-400 focus:border-transparent" required />
                            {resetForm.newPassword && resetForm.confirmPassword && (
                              <p className={`text-xs mt-1 ${resetForm.newPassword === resetForm.confirmPassword ? 'text-green-600' : 'text-red-500'}`}>
                                {resetForm.newPassword === resetForm.confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
                              </p>
                            )}
                          </div>
                          <button type="submit" disabled={resetLoading}
                            className="w-full py-2.5 rounded-xl text-white font-semibold disabled:opacity-60"
                            style={{background:'linear-gradient(to right,var(--ht-primary),var(--ht-accent))'}}>
                            {resetLoading ? 'Resetting...' : 'Reset Password'}
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                )}

                {/* ===== FORGOT PASSWORD MODAL (Login Screen) ===== */}
                {showForgotPassword && (
                  <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-gray-800">Forgot Password</h2>
                        <button onClick={() => setShowForgotPassword(false)} className="text-gray-400 hover:text-gray-600 text-2xl font-bold leading-none">&times;</button>
                      </div>
                      {forgotStatus ? (
                        <div className="text-center py-6">
                          <div className="text-5xl mb-4">📧</div>
                          <p className="text-green-700 font-semibold text-base mb-2">✅ Temporary Password Sent!</p>
                          <p className="text-gray-600 text-sm mb-6">{forgotStatus}</p>
                          <button onClick={() => { setShowForgotPassword(false); setForgotStatus(''); }}
                            className="px-6 py-2 rounded-xl text-white font-semibold" style={{background:'linear-gradient(to right,var(--ht-primary),var(--ht-accent))'}}>
                            Back to Login
                          </button>
                        </div>
                      ) : (
                        <form onSubmit={handleForgotPassword}>
                          <p className="text-sm text-gray-500 mb-4">Enter your registered <strong>email address</strong> or <strong>mobile number</strong> and we'll send you a temporary password.</p>
                          {forgotError && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-4">{forgotError}</div>}
                          <div className="mb-4">
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Email or Mobile Number</label>
                            <input
                              type="text"
                              value={forgotEmail}
                              onChange={(e) => { setForgotEmail(e.target.value); setForgotError(''); }}
                              placeholder="e.g. juan@email.com or 09XXXXXXXXX"
                              autoFocus
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-400 focus:border-transparent"
                            />
                            <p className="text-xs text-gray-400 mt-1">Temp password will be sent to your registered email</p>
                          </div>
                          <div className="flex gap-3">
                            <button type="button" onClick={() => { setShowForgotPassword(false); setForgotEmail(''); setForgotError(''); setForgotStatus(''); }}
                              className="flex-1 py-2.5 border border-gray-300 rounded-xl text-gray-600 font-semibold hover:bg-gray-50">Cancel</button>
                            <button type="submit" disabled={forgotLoading}
                              className="flex-1 py-2.5 rounded-xl text-white font-semibold disabled:opacity-60"
                              style={{background:'linear-gradient(to right,var(--ht-primary),var(--ht-accent))'}}>
                              {forgotLoading ? 'Sending...' : 'Send Temporary Password'}
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  </div>
                )}

                <div className="max-w-md w-full">
                  <div className="bg-white rounded-2xl shadow-2xl p-8">
                    <div className="text-center mb-6">
                      {/* Language toggle */}
                      <div className="flex justify-end mb-1">
                        <button onClick={toggleLang} className="text-xs px-3 py-1 rounded-full border border-gray-300 text-gray-500 hover:bg-gray-50 font-medium transition-colors">
                          🌐 {t('langToggle')}
                        </button>
                      </div>
                      <div className="flex justify-center mb-3">
                        <img src="Upper_Bicutan_Logo.jpg" alt="Barangay Upper Bicutan" className="w-20 h-20 object-contain drop-shadow-md" style={{borderRadius:'50%'}} />
                      </div>
                      <h1 className="text-3xl font-bold mb-1" style={{color:'var(--ht-primary)'}}>HealthTrack</h1>
                      <p className="text-sm font-medium" style={{color:'var(--ht-accent)'}}>Patient Information System with Queueing</p>
                      <p className="text-gray-500 text-xs mt-1">For Barangay Upper Bicutan Health Clinics - City of Taguig</p>
                    </div>

                    {otpStep ? (
                      /* ===== OTP VERIFICATION SCREEN ===== */
                      registerSuccess ? (
                        /* ===== SUCCESS STATE ===== */
                        <div className="text-center py-8 space-y-4">
                          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                            <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <h2 className="text-xl font-bold text-gray-800">Account Created!</h2>
                          <p className="text-sm text-gray-600">{registerSuccess}</p>
                          <p className="text-xs text-gray-400">Closing automatically...</p>
                        </div>
                      ) :
                      <div className="space-y-5">
                        <div className="text-center">
                          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <span className="text-3xl">{pendingAccount && pendingAccount.email ? '📧' : '📱'}</span>
                          </div>
                          <h3 className="text-lg font-bold text-gray-800">Verify Your Account</h3>
                          <p className="text-sm text-gray-500 mt-1">
                            A 6-digit OTP has been sent to
                          </p>
                          <p className="text-sm font-semibold text-blue-600 mt-0.5">{otpContact}</p>
                        </div>

                        {/* Demo OTP display — remove in production */}
                        <div className="bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 text-center">
                          <p className="text-xs text-amber-600 font-semibold uppercase tracking-wide mb-1">Demo Mode — OTP Code</p>
                          <p className="text-2xl font-mono font-bold tracking-widest text-amber-800">{otpCode}</p>
                          <p className="text-xs text-amber-500 mt-1">In production this will be sent via {pendingAccount && pendingAccount.email ? 'email' : 'SMS'}</p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Enter OTP <span className="text-red-500">*</span></label>
                          <input
                            type="text"
                            value={otpInput}
                            onChange={(e) => setOtpInput(e.target.value.replace(/\D/g,'').slice(0,6))}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center text-2xl font-mono tracking-widest"
                            placeholder="------"
                            maxLength={6}
                          />
                          {otpError && <p className="text-xs text-red-500 mt-1">{otpError}</p>}
                        </div>

                        <button
                          type="button"
                          onClick={handleVerifyOTP}
                          className="w-full py-3 text-white font-semibold rounded-xl transition-colors" style={{background:'var(--ht-primary)'}}
                        >
                          ✓ Verify &amp; Create Account
                        </button>

                        <div className="flex items-center justify-between text-sm">
                          <button type="button" onClick={handleCancelOTP} className="text-gray-500 hover:text-gray-700 hover:underline">
                            ← Back to Registration
                          </button>
                          <button type="button" onClick={handleResendOTP} className="text-blue-600 hover:text-blue-700 hover:underline">
                            Resend OTP {otpResendCount > 0 && `(${otpResendCount})`}
                          </button>
                        </div>
                      </div>
                    ) : !showCreateAccount ? (
                      /* ===== LOGIN FORM ===== */
                      <form onSubmit={handleLogin}>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Users className="w-4 h-4 text-gray-400" />
                              </div>
                              <input
                                type="text"
                                value={loginUsername}
                                onChange={(e) => { setLoginUsername(e.target.value); setLoginError(''); }}
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                placeholder="Enter your username"
                                autoComplete="username"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                              </div>
                              <input
                                type={showPassword ? "text" : "password"}
                                value={loginPassword}
                                onChange={(e) => { setLoginPassword(e.target.value); setLoginError(''); }}
                                className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                placeholder="Enter your password"
                                autoComplete="current-password"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                              >
                                {showPassword ? (
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                                  </svg>
                                ) : (
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                )}
                              </button>
                            </div>
                          </div>

                          {loginError && (
                            <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
                              <AlertCircle className="w-4 h-4 flex-shrink-0" />
                              <p className="text-sm">{loginError}</p>
                            </div>
                          )}

                          <button
                            type="submit"
                            className="w-full text-white py-3 rounded-xl font-semibold transition-all transform hover:scale-105 shadow-lg" style={{background:'linear-gradient(to right,var(--ht-primary),var(--ht-accent))'}}
                          >
                            {t('loginBtn')}
                          </button>
                        </div>

                        <div className="mt-4 text-center">
                          <button
                            type="button"
                            onClick={() => { setShowForgotPassword(true); setForgotEmail(''); setForgotError(''); setForgotStatus(''); }}
                            className="text-sm text-gray-500 hover:text-red-700 hover:underline transition-colors"
                          >
                            {t('forgotPassword')}
                          </button>
                        </div>

                        <div className="mt-4 text-center">
                          <p className="text-sm text-gray-600">
                            {t('noAccount')}{' '}
                            <button
                              type="button"
                              onClick={() => { setShowCreateAccount(true); setLoginError(''); setRegisterError(''); setRegisterSuccess(''); }}
                              className="text-blue-600 hover:text-blue-700 font-semibold hover:underline"
                            >
                              {t('createAccountTitle')}
                            </button>
                          </p>
                        </div>


                      </form>
                    ) : (
                      /* ===== CREATE ACCOUNT FORM ===== */
                      <form onSubmit={handleCreateAccount}>
                        <div className="space-y-3">
                          {/* Name Fields */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{t('lastName')} <span className="text-red-500">*</span></label>
                            <input
                              type="text"
                              value={newAccount.lastName}
                              onChange={(e) => setNewAccount({...newAccount, lastName: e.target.value})}
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="e.g. Dela Cruz"
                            />
                          </div>

                          <div className="grid grid-cols-3 gap-2">
                            <div className="col-span-2">
                              <label className="block text-sm font-medium text-gray-700 mb-1">{t('firstName')} <span className="text-red-500">*</span></label>
                              <input
                                type="text"
                                value={newAccount.firstName}
                                onChange={(e) => setNewAccount({...newAccount, firstName: e.target.value})}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="e.g. Juan"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">{t('middleInitial')}</label>
                              <input
                                type="text"
                                value={newAccount.middleInitial}
                                onChange={(e) => setNewAccount({...newAccount, middleInitial: e.target.value.slice(0,1).toUpperCase()})}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center font-semibold"
                                placeholder="A"
                                maxLength={1}
                              />
                            </div>
                          </div>

                          {/* Date of Birth */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{t('dateOfBirth')} <span className="text-red-500">*</span></label>
                            <input
                              type="date"
                              value={newAccount.birthday}
                              onChange={(e) => setNewAccount({...newAccount, birthday: e.target.value})}
                              max={(() => { const d = new Date(); d.setFullYear(d.getFullYear() - 18); return d.toISOString().split('T')[0]; })()}
                              min={(() => { const d = new Date(); d.setFullYear(d.getFullYear() - 85); return d.toISOString().split('T')[0]; })()}
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            {newAccount.birthday && (() => {
                              const today = new Date();
                              const dob = new Date(newAccount.birthday);
                              let age = today.getFullYear() - dob.getFullYear();
                              const m = today.getMonth() - dob.getMonth();
                              if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
                              if (age < 18) return React.createElement('p', {className: 'text-xs text-red-500 mt-1'}, lang === 'fil' ? '✗ Dapat hindi bababa sa 18 taong gulang' : '✗ Must be at least 18 years old to register');
                              if (age > 85) return React.createElement('p', {className: 'text-xs text-red-500 mt-1'}, lang === 'fil' ? '✗ Para lamang sa edad 18–85' : '✗ Registration is only available for ages 18–85');
                              return React.createElement('p', {className: 'text-xs text-green-500 mt-1'}, lang === 'fil' ? `✓ ${age} taong gulang — maaaring magrehistro` : `✓ Age ${age} — eligible to register`);
                            })()}
                            <p className="text-xs text-gray-400 mt-1">{t('dobHint')}</p>
                          </div>

                          {/* Contact Method for Confirmation */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{t('accountConfirmation')} <span className="text-red-500">*</span></label>
                            <div className="grid grid-cols-2 gap-2 mb-2">
                              <button type="button"
                                onClick={() => setNewAccount({...newAccount, contactMethod: 'email'})}
                                className={`py-2 px-3 rounded-xl text-sm font-medium border-2 transition-all ${newAccount.contactMethod === 'email' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                                📧 {t('email')}
                              </button>
                              <button type="button"
                                onClick={() => setNewAccount({...newAccount, contactMethod: 'mobile'})}
                                className={`py-2 px-3 rounded-xl text-sm font-medium border-2 transition-all ${newAccount.contactMethod === 'mobile' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                                📱 {t('mobile')}
                              </button>
                            </div>
                            {newAccount.contactMethod === 'email' ? (
                              <input
                                type="email"
                                value={newAccount.email}
                                onChange={(e) => setNewAccount({...newAccount, email: e.target.value})}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder={t('emailPlaceholder')}
                              />
                            ) : (
                              <>
                                <input
                                  type="tel"
                                  value={newAccount.mobile}
                                  onChange={(e) => setNewAccount({...newAccount, mobile: sanitizePhone(e.target.value)})}
                                  className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${phoneClass(newAccount.mobile)}`}
                                  placeholder="09XXXXXXXXX or 8-digit landline"
                                  maxLength={16}
                                />
                                <PhoneMsg val={newAccount.mobile} />
                              </>
                            )}
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{t('username')} <span className="text-red-500">*</span></label>
                            <input
                              type="text"
                              value={newAccount.username}
                              onChange={(e) => setNewAccount({...newAccount, username: e.target.value})}
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder={t('usernamePlaceholder')}
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{t('password')} <span className="text-red-500">*</span></label>
                            <div className="relative">
                              <input
                                type={showRegPassword ? "text" : "password"}
                                value={newAccount.password}
                                onChange={(e) => setNewAccount({...newAccount, password: e.target.value})}
                                className="w-full px-4 py-2.5 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Min 8 chars, letters + numbers + special"
                              />
                              <button
                                type="button"
                                onClick={() => setShowRegPassword(!showRegPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                              >
                                {showRegPassword ? (
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" /></svg>
                                ) : (
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                )}
                              </button>
                            </div>
                            {newAccount.password && (
                              <div className="mt-1 space-y-0.5">
                                <p className={`text-xs ${newAccount.password.length >= 8 ? 'text-green-500' : 'text-red-400'}`}>
                                  {newAccount.password.length >= 8 ? '✓' : '✗'} At least 8 characters
                                </p>
                                <p className={`text-xs ${/[a-zA-Z]/.test(newAccount.password) && /[0-9]/.test(newAccount.password) ? 'text-green-500' : 'text-red-400'}`}>
                                  {/[a-zA-Z]/.test(newAccount.password) && /[0-9]/.test(newAccount.password) ? '✓' : '✗'} Letters and numbers
                                </p>
                                <p className={`text-xs ${/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newAccount.password) ? 'text-green-500' : 'text-red-400'}`}>
                                  {/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newAccount.password) ? '✓' : '✗'} At least one special character
                                </p>
                              </div>
                            )}
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{t('confirmPassword')} <span className="text-red-500">*</span></label>
                            <input
                              type="password"
                              value={newAccount.confirmPassword}
                              onChange={(e) => setNewAccount({...newAccount, confirmPassword: e.target.value})}
                              placeholder={t('confirmPasswordPlaceholder')}
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="Re-enter password"
                            />
                            {newAccount.password && newAccount.confirmPassword && newAccount.password !== newAccount.confirmPassword && (
                              <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                            )}
                            {newAccount.password && newAccount.confirmPassword && newAccount.password === newAccount.confirmPassword && (
                              <p className="text-xs text-green-500 mt-1">Passwords match</p>
                            )}
                          </div>

                          {/* ── Personal Information Section ── */}
                          <div className="border-t pt-4 mt-2">
                            <p className="text-sm font-bold text-gray-700 mb-3">Personal Information <span className="text-xs font-normal text-gray-400">(saved to your patient record)</span></p>
                            <div className="grid grid-cols-2 gap-3 mb-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Sex <span className="text-red-500">*</span></label>
                                <select value={newAccount.sex} onChange={(e) => setNewAccount({...newAccount, sex: e.target.value})}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent">
                                  <option value="">Select</option>
                                  <option value="Male">Male</option>
                                  <option value="Female">Female</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Civil Status</label>
                                <select value={newAccount.civilStatus} onChange={(e) => {
                                    const age = calcAge(newAccount.birthday);
                                    if (age !== null && age < 15 && ['Married','Separated','Widowed'].includes(e.target.value)) {
                                      alert('⚠️ Under RA 11596 (Prohibition of Child Marriage Act), the minimum age for marriage in the Philippines is 18 years old. Civil status cannot be Married, Separated, or Widowed for users under 18.');
                                      return;
                                    }
                                    setNewAccount({...newAccount, civilStatus: e.target.value});
                                  }}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent">
                                  <option value="">Select</option>
                                  <option value="Single">Single</option>
                                  <option value="Married">Married</option>
                                  <option value="Widowed">Widowed</option>
                                  <option value="Separated">Separated</option>
                                </select>
                              </div>
                            </div>
                            <div className="mb-3">
                              <label className="block text-xs font-medium text-gray-600 mb-1">Address <span className="text-red-500">*</span></label>
                              <input type="text" value={newAccount.address} onChange={(e) => setNewAccount({...newAccount, address: e.target.value})}
                                placeholder="Barangay, City/Municipality"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent" />
                            </div>
                            <div className="grid grid-cols-2 gap-3 mb-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Contact Number <span className="text-red-500">*</span></label>
                                <input type="text" value={newAccount.contactNumber}
                                  onChange={(e) => {
                                    const val = e.target.value.replace(/[^0-9+\-\s]/g,'').slice(0,12);
                                    setNewAccount({...newAccount, contactNumber: val});
                                    const {msg} = validateContactNumber(val);
                                    setContactNumberError(msg);
                                  }}
                                  placeholder="09XXXXXXXXX or 8-digit landline" maxLength={12}
                                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent ${contactNumberError && newAccount.contactNumber ? 'border-red-400 bg-red-50' : 'border-gray-300'}`} />
                                {contactNumberError && newAccount.contactNumber && (
                                  <p className="text-xs text-red-500 mt-1">{contactNumberError}</p>
                                )}
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Occupation</label>
                                <input type="text" value={newAccount.occupation} onChange={(e) => setNewAccount({...newAccount, occupation: e.target.value})}
                                  placeholder="e.g. Teacher"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent" />
                              </div>
                            </div>
                            {/* Senior Citizen / PWD */}
                            <div className="grid grid-cols-2 gap-3 mb-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                  PWD ID Number <span className="text-gray-400">(optional)</span>
                                </label>
                                <input type="text" value={newAccount.pwdId || ''} onChange={(e) => setNewAccount({...newAccount, pwdId: e.target.value})}
                                  placeholder="e.g. PWD-2024-XXXXX"
                                  className="w-full px-3 py-2 border border-blue-200 bg-blue-50 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent" />
                                <p className="text-xs text-blue-600 mt-1">♿ PWD patients are auto-set to Priority Case</p>
                              </div>
                              <div className="flex flex-col justify-center">
                                {(() => {
                                  const dob = newAccount.dateOfBirth || newAccount.birthday;
                                  if (!dob) return null;
                                  const age = Math.floor((Date.now() - new Date(dob)) / 31557600000);
                                  if (age >= 60) return (
                                    <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
                                      👴 <strong>Senior Citizen (Age {age})</strong><br/>Auto-set to Urgent priority
                                    </div>
                                  );
                                  return null;
                                })()}
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3 mb-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Emergency Contact Person</label>
                                <input type="text" value={newAccount.emergencyContactPerson} onChange={(e) => setNewAccount({...newAccount, emergencyContactPerson: e.target.value})}
                                  placeholder="Full name"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent" />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Emergency Contact Number</label>
                                <input type="text" value={newAccount.emergencyContactNumber}
                                  onChange={(e) => setNewAccount({...newAccount, emergencyContactNumber: e.target.value.replace(/[^0-9+\-\s]/g, '').slice(0,12)})}
                                  placeholder="09XXXXXXXXX or 8-digit landline" maxLength={12}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent" />
                              </div>
                            </div>
                            <div className="mb-3">
                              <div className="flex justify-between items-center mb-1"><label className="block text-xs font-medium text-gray-600">Allergies</label><button type="button" onClick={() => setNewAccount({...newAccount, allergies: 'None'})} className="text-xs text-blue-500 hover:text-blue-700 font-medium">+ None</button></div>
                              <input type="text" value={newAccount.allergies} onChange={(e) => setNewAccount({...newAccount, allergies: e.target.value})}
                                placeholder="e.g. Penicillin, Peanuts (leave blank if none)"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent" />
                            </div>
                            <div className="mb-3">
                              <div className="flex justify-between items-center mb-1"><label className="block text-xs font-medium text-gray-600">Chronic Conditions</label><button type="button" onClick={() => setNewAccount({...newAccount, chronicConditions: 'None'})} className="text-xs text-blue-500 hover:text-blue-700 font-medium">+ None</button></div>
                              <input type="text" value={newAccount.chronicConditions} onChange={(e) => setNewAccount({...newAccount, chronicConditions: e.target.value})}
                                placeholder="e.g. Hypertension, Diabetes (leave blank if none)"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent" />
                            </div>
                            <div>
                              <div className="flex justify-between items-center mb-1"><label className="block text-xs font-medium text-gray-600">Current Medications</label><button type="button" onClick={() => setNewAccount({...newAccount, currentMedications: 'None'})} className="text-xs text-blue-500 hover:text-blue-700 font-medium">+ None</button></div>
                              <textarea value={newAccount.currentMedications} onChange={(e) => setNewAccount({...newAccount, currentMedications: e.target.value})}
                                placeholder="List current medications (leave blank if none)"
                                rows={2}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent resize-none" />
                            </div>
                          </div>

                          <div className="flex items-start gap-2 mt-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                              <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
                              <p className="text-xs text-amber-700">Admin and Staff accounts are exclusive to clinic personnel and can only be created by a system administrator.</p>
                            </div>

                          {registerError && (
                            <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
                              <AlertCircle className="w-4 h-4 flex-shrink-0" />
                              <p className="text-sm">{registerError}</p>
                            </div>
                          )}

                          {registerSuccess && (
                            <div className="flex items-center space-x-2 text-green-600 bg-green-50 p-3 rounded-lg">
                              <CheckCircle className="w-4 h-4 flex-shrink-0" />
                              <p className="text-sm">{registerSuccess}</p>
                            </div>
                          )}

                          <button
                            type="submit"
                            className="w-full text-white py-3 rounded-xl font-semibold transition-all transform hover:scale-105 shadow-lg" style={{background:'linear-gradient(to right,var(--ht-accent),var(--ht-primary))'}}
                          >
                            {t('registerBtn')}
                          </button>
                        </div>

                        <div className="mt-4 text-center">
                          <p className="text-sm text-gray-600">
                            {t('alreadyHaveAccount')}{' '}
                            <button
                              type="button"
                              onClick={() => { setShowCreateAccount(false); setRegisterError(''); setRegisterSuccess(''); }}
                              className="text-blue-600 hover:text-blue-700 font-semibold hover:underline"
                            >
                              Sign In
                            </button>
                          </p>
                        </div>
                      </form>
                    )}
                  </div>
                </div>
              </div>
            );
          }

          // ==================== RENDER: RESIDENT PORTAL ====================
          if (userRole === 'resident') {
            return (
              <div className="min-h-screen bg-gray-50">

                {/* ===== SETTINGS MODAL (Resident) ===== */}
                {showSettingsModal && (
                  <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={() => setShowSettingsModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-between px-6 py-4 border-b" style={{background:'linear-gradient(to right,var(--ht-primary),var(--ht-accent))'}}>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0" style={{background: avatarColor}}>
                            {(currentUser?.fullName || currentUser?.username || '?')[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="text-white font-bold text-sm">{currentUser?.fullName || currentUser?.username}</p>
                            <p className="text-white/80 text-xs capitalize">Resident</p>
                          </div>
                        </div>
                        <button onClick={() => setShowSettingsModal(false)} className="text-white/80 hover:text-white text-2xl font-bold leading-none">&times;</button>
                      </div>
                      <div className="flex border-b bg-gray-50 overflow-x-auto">
                        {[
                          { id:'profile',  label:'Profile',  icon:'👤' },
                          { id:'avatar',   label:'Avatar',   icon:'🎨' },
                          { id:'contact',  label:'Contact',  icon:'📱' },
                          { id:'email',    label:'Email',    icon:'✉️' },
                          { id:'password', label:'Password', icon:'🔒' },
                        ].map(tab => (
                          <button key={tab.id} onClick={() => { setSettingsTab(tab.id); setSettingsError(''); setSettingsSuccess(''); }}
                            className={`flex-1 py-3 text-xs font-semibold transition-colors whitespace-nowrap px-2 ${settingsTab === tab.id ? 'border-b-2 text-red-700 bg-white' : 'text-gray-500 hover:text-gray-700'}`}
                            style={settingsTab === tab.id ? {borderColor:'var(--ht-primary)'} : {}}>
                            {tab.icon} {tab.label}
                          </button>
                        ))}
                      </div>
                      <div className="px-6 py-5">
                        {settingsError && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2 text-sm mb-4">{settingsError}</div>}
                        {settingsSuccess && <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-2 text-sm mb-4">✓ {settingsSuccess}</div>}
                        {settingsTab === 'profile' && (
                          <div className="space-y-3">
                            <p className="text-xs text-gray-500 mb-3">Update your display name.</p>
                            <div><label className="block text-sm font-semibold text-gray-700 mb-1">First Name</label>
                              <input type="text" value={settingsForm.firstName} onChange={e => setSettingsForm(f=>({...f,firstName:e.target.value}))}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-400 focus:border-transparent" /></div>
                            <div><label className="block text-sm font-semibold text-gray-700 mb-1">Middle Initial <span className="text-gray-400 font-normal">(optional)</span></label>
                              <input type="text" value={settingsForm.middleInitial} onChange={e => setSettingsForm(f=>({...f,middleInitial:e.target.value.slice(0,1).toUpperCase()}))}
                                maxLength={1} placeholder="A"
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-400 focus:border-transparent" /></div>
                            <div><label className="block text-sm font-semibold text-gray-700 mb-1">Last Name</label>
                              <input type="text" value={settingsForm.lastName} onChange={e => setSettingsForm(f=>({...f,lastName:e.target.value}))}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-400 focus:border-transparent" /></div>
                          </div>
                        )}
                        {settingsTab === 'avatar' && (
                          <div>
                            <p className="text-xs text-gray-500 mb-4">Choose a color for your avatar.</p>
                            <div className="flex justify-center mb-5">
                              <div className="w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-3xl shadow-lg" style={{background: avatarColor}}>
                                {(currentUser?.fullName || currentUser?.username || '?')[0].toUpperCase()}
                              </div>
                            </div>
                            <div className="flex flex-wrap justify-center gap-3">
                              {AVATAR_COLORS.map(c => (
                                <button key={c} onClick={() => setAvatarColor(c)}
                                  className={`w-10 h-10 rounded-full transition-all transform hover:scale-110 ${avatarColor === c ? 'ring-4 ring-offset-2 scale-110' : ''}`}
                                  style={{background: c}} />
                              ))}
                            </div>
                          </div>
                        )}
                        {settingsTab === 'contact' && (
                          <div>
                            <p className="text-xs text-gray-500 mb-3">Update your contact number.</p>
                            <div><label className="block text-sm font-semibold text-gray-700 mb-1">Contact Number</label>
                              <input type="text" value={settingsForm.contactNumber} onChange={e => setSettingsForm(f=>({...f,contactNumber:e.target.value}))}
                                placeholder="09XXXXXXXXX"
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-400 focus:border-transparent" /></div>
                          </div>
                        )}
                        {settingsTab === 'email' && (
                          <div>
                            <p className="text-xs text-gray-500 mb-3">Update your email address.</p>
                            <div><label className="block text-sm font-semibold text-gray-700 mb-1">Email Address</label>
                              <input type="email" value={settingsForm.email} onChange={e => setSettingsForm(f=>({...f,email:e.target.value}))}
                                placeholder="email@example.com"
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-400 focus:border-transparent" /></div>
                          </div>
                        )}
                        {settingsTab === 'password' && (
                          <div className="space-y-3">
                            <p className="text-xs text-gray-500 mb-3">Choose a strong password with at least 8 characters.</p>
                            <div><label className="block text-sm font-semibold text-gray-700 mb-1">Current Password</label>
                              <input type="password" value={settingsForm.currentPassword} onChange={e => setSettingsForm(f=>({...f,currentPassword:e.target.value}))}
                                placeholder="Enter current password"
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-400 focus:border-transparent" /></div>
                            <div><label className="block text-sm font-semibold text-gray-700 mb-1">New Password</label>
                              <input type="password" value={settingsForm.newPassword} onChange={e => setSettingsForm(f=>({...f,newPassword:e.target.value}))}
                                placeholder="Min 8 characters"
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-400 focus:border-transparent" /></div>
                            <div><label className="block text-sm font-semibold text-gray-700 mb-1">Confirm New Password</label>
                              <input type="password" value={settingsForm.confirmNewPassword} onChange={e => setSettingsForm(f=>({...f,confirmNewPassword:e.target.value}))}
                                placeholder="Re-enter new password"
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-400 focus:border-transparent" /></div>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-3 px-6 pb-5">
                        <button onClick={() => setShowSettingsModal(false)}
                          className="flex-1 py-2.5 border border-gray-300 rounded-xl text-gray-600 font-semibold hover:bg-gray-50">Cancel</button>
                        <button onClick={saveSettings} disabled={settingsLoading}
                          className="flex-1 py-2.5 rounded-xl text-white font-semibold disabled:opacity-60"
                          style={{background:'linear-gradient(to right,var(--ht-primary),var(--ht-accent))'}}>
                          {settingsLoading ? 'Saving...' : 'Save Changes'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Header */}
                {/* ── Idle Session Warning Modal ── */}
                {showIdleWarning && (
                  <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center">
                      <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
                      </div>
                      <h2 className="text-xl font-bold text-gray-800 mb-2">Session Expiring Soon</h2>
                      <p className="text-gray-500 text-sm mb-3">You will be automatically logged out due to inactivity in</p>
                      <div className="text-5xl font-bold text-amber-500 mb-1">{idleCountdown}s</div>
                      <div className="w-full bg-gray-100 rounded-full h-2 mb-4">
                        <div className="bg-amber-400 h-2 rounded-full transition-all" style={{width: `${(idleCountdown/120)*100}%`}}></div>
                      </div>
                      <p className="text-xs text-gray-400 mb-5">Your session is protected automatically to keep patient data secure.</p>
                      <button
                        onClick={() => { setLastActivity(Date.now()); setShowIdleWarning(false); }}
                        className="w-full text-white py-3 rounded-xl font-bold transition-all mb-2" style={{background:'linear-gradient(to right,var(--ht-primary),var(--ht-accent))'}}
                      >
                        ✓ I'm still here — Stay Logged In
                      </button>
                      <button
                        onClick={handleLogout}
                        className="w-full text-gray-400 hover:text-gray-600 text-sm py-2"
                      >
                        Log out now
                      </button>
                    </div>
                  </div>
                )}
                <div className="text-white shadow-lg" style={{background:'linear-gradient(to right,var(--ht-primary),var(--ht-accent))'}}>
                  <div className="container mx-auto px-4 py-4">
                    <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <img src="Upper_Bicutan_Logo.jpg" alt="Barangay Upper Bicutan" className="w-10 h-10 object-contain rounded-full flex-shrink-0" style={{background:'rgba(255,255,255,0.15)',padding:'2px'}} />
                      <div>
                        <h1 className="text-2xl font-bold">HealthTrack — Resident Portal</h1>
                        <p className="text-sm" style={{color:'rgba(255,255,255,0.85)'}}>Self-Service Queue and Visit History · Barangay Upper Bicutan, City of Taguig</p>
                      </div>
                    </div>
                      <div className="flex items-center space-x-2">
                        <div className="relative">
                        <button onClick={(e) => { e.stopPropagation(); setShowSettingsMenu(v => !v); }}
                          className="flex items-center gap-2 hover:bg-white/10 rounded-xl px-3 py-2 transition-colors cursor-pointer">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-base flex-shrink-0"
                            style={{background: avatarColor}}>
                            {(currentUser?.fullName || currentUser?.username || '?')[0].toUpperCase()}
                          </div>
                          <div className="text-right hidden sm:block">
                            <p className="text-sm font-semibold text-white leading-tight">{currentUser ? currentUser.fullName : (userRole === 'admin' ? 'Administrator' : 'Staff')}</p>
                            <p className="text-xs text-purple-200">Resident</p>
                          </div>
                          <svg className="w-4 h-4 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </button>
                        {showSettingsMenu && (
                          <div onClick={(e) => e.stopPropagation()} className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
                            <div className="px-4 py-3 bg-gray-50 border-b">
                              <p className="text-sm font-bold text-gray-800">{currentUser?.fullName || currentUser?.username}</p>
                              <p className="text-xs text-gray-500 capitalize">{currentUser?.role || userRole}</p>
                            </div>
                            {[
                              { label:'Edit Profile Information', icon:'👤', tab:'profile' },
                              { label:'Change Avatar Color',      icon:'🎨', tab:'avatar' },
                              { label:'Update Contact Number',    icon:'📱', tab:'contact' },
                              { label:'Update Email Address',     icon:'✉️', tab:'email' },
                              { label:'Change Password',          icon:'🔒', tab:'password' },
                            ].map(item => (
                              <button key={item.tab} onClick={() => openSettings(item.tab)}
                                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-red-50 hover:text-red-700 transition-colors text-left">
                                <span>{item.icon}</span>{item.label}
                              </button>
                            ))}
                            {userRole === 'admin' && (
                              <div className="border-t">
                                <button onClick={() => { setShowSettingsMenu(false); setServiceMgmtTab('categories'); setServiceMgmtMsg(''); setShowServiceMgmt(true); }}
                                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-blue-700 hover:bg-blue-50 transition-colors text-left font-semibold">
                                  <span>⚙️</span> Service Management
                                </button>
                                <button onClick={() => { setShowSettingsMenu(false); setDoctorMsg(''); setDoctorForm({id:'',name:'',specialty:'General Physician',schedules:[],enabled:true}); setEditingDoctorId(null); setShowDoctorMgmt(true); }}
                                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-green-700 hover:bg-green-50 transition-colors text-left font-semibold">
                                  <span>👨‍⚕️</span> Doctor Management
                                </button>
                              </div>
                            )}
                            <div className="border-t">
                              <button onClick={() => { setShowSettingsMenu(false); handleLogout(); }}
                                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors text-left">
                                <span>🚪</span> Logout
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Navigation */}
                <div className="bg-white shadow-sm border-b">
                  <div className="container mx-auto px-4">
                    <div className="flex items-center justify-between gap-2">
                      <nav className="nav-scroll flex-1 min-w-0">
                        <div className="flex space-x-1">
                          {[
                          { id: 'queue', label: t('queueStatus'), icon: Clock },
                          { id: 'appointments', label: t('myAppointments'), icon: List },
                          { id: 'booking', label: t('bookAppointment'), icon: Calendar },
                          { id: 'history', label: t('myVisitHistory'), icon: FileText }
                        ].map(tab => (
                          <button
                            key={tab.id}
                            onClick={() => setResidentView(tab.id)}
                            className={`flex items-center space-x-2 px-6 py-4 border-b-2 transition-colors ${
                              residentView === tab.id
                                ? 'border-transparent font-semibold'
                                : 'border-transparent text-gray-600 hover:border-gray-300'
                            }`}
                            style={residentView === tab.id ? {borderColor:'var(--ht-primary)',color:'var(--ht-primary)',borderBottomColor:'var(--ht-primary)'} : {}}
                          >
                            <tab.icon className="w-5 h-5" />
                            <span>{tab.label}</span>
                          </button>
                        ))}
                        </div>
                      </nav>
                      {/* Language Toggle + Notification Bell */}
                      <div className="flex items-center gap-1 pr-2 flex-shrink-0">
                        <button onClick={toggleLang} className="text-xs px-2 py-1 rounded-full border border-gray-300 text-gray-500 hover:bg-gray-50 font-medium transition-colors whitespace-nowrap">
                          🌐 {t('langToggle')}
                        </button>
                      <div className="relative">
                        <button
                          onClick={() => { setShowNotifPanel(!showNotifPanel); markNotifsRead(); }}
                          className="relative p-2 text-gray-500 hover:text-purple-600 transition-colors"
                        >
                          <Bell className="w-6 h-6" />
                          {notifications.filter(n => !n.read).length > 0 && (
                            <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center font-bold">
                              {notifications.filter(n => !n.read).length}
                            </span>
                          )}
                        </button>
                        {/* Notification Dropdown */}
                        {showNotifPanel && (
                          <div className="absolute right-0 top-full mt-1 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden">
                            <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-3 flex items-center justify-between">
                              <p className="text-white font-bold text-sm">Notifications</p>
                              <button onClick={() => setShowNotifPanel(false)} className="text-white/70 hover:text-white text-lg leading-none">&times;</button>
                            </div>
                            <div className="max-h-72 overflow-y-auto divide-y divide-gray-100">
                              {notifications.length === 0 ? (
                                <div className="px-4 py-6 text-center text-gray-400 text-sm">No notifications yet</div>
                              ) : notifications.map(n => (
                                <div key={n.id} className={`px-4 py-3 ${n.read ? 'bg-white' : 'bg-purple-50'}`}>
                                  <div className="flex items-start gap-2">
                                    <span className="text-lg mt-0.5">
                                      {n.type === 'accepted' ? '✅' : n.type === 'rejected' ? '❌' : 'ℹ️'}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                      <p className={`text-sm font-bold ${n.type === 'accepted' ? 'text-green-700' : n.type === 'rejected' ? 'text-red-700' : 'text-gray-800'}`}>
                                        {n.title}
                                      </p>
                                      <p className="text-xs text-gray-600 mt-0.5 leading-snug">{n.message}</p>
                                      <p className="text-xs text-gray-400 mt-1">{new Date(n.timestamp).toLocaleString('en-PH')}</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="container mx-auto px-4 py-6">
                  {/* Queue Status View */}
                  {residentView === 'queue' && (() => {
                    // Privacy: only show this resident's own queue entry
                    const myEntries = queue.filter(q =>
                      (q.bookedByUsername === currentUser?.username ||
                      (q.selfBooked && q.patientId && registeredPatients.find(p =>
                        p.patientId === q.patientId &&
                        (p.firstName + ' ' + p.lastName).toLowerCase() === currentUser?.fullName?.toLowerCase()
                      ))) &&
                      !['Completed','Cancelled','Rejected'].includes(q.status)
                    );
                    // Prioritize: In Progress > today's date > most recently booked
                    const myEntry = myEntries.sort((a, b) => {
                      if (a.status === 'In Progress') return -1;
                      if (b.status === 'In Progress') return 1;
                      const today = getLocalDateStr();
                      const aToday = a.appointmentDate === today ? 0 : 1;
                      const bToday = b.appointmentDate === today ? 0 : 1;
                      if (aToday !== bToday) return aToday - bToday;
                      return new Date(b.timeQueued) - new Date(a.timeQueued);
                    })[0] || null;
                    const queuePosition = myEntry
                      ? queue.filter(q => q.status !== 'Cancelled' && q.status !== 'Rejected').findIndex(q => q.id === myEntry.id) + 1
                      : null;
                    const apptSlot = myEntry?.appointmentTime ? CLINIC_SLOTS.find(s => s.value === myEntry.appointmentTime) : null;
                    const apptDateStr = myEntry?.appointmentDate
                      ? new Date(myEntry.appointmentDate + 'T00:00:00').toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
                      : null;
                    const statusColors = {
                      'Accepted':  { bg: 'bg-green-50 border-green-300',  badge: 'bg-green-100 text-green-700', icon: '✅', label: 'Accepted' },
                      'Rejected':  { bg: 'bg-red-50 border-red-300',      badge: 'bg-red-100 text-red-700',    icon: '❌', label: 'Rejected' },
                      'Waiting':   { bg: 'bg-yellow-50 border-yellow-300', badge: 'bg-yellow-100 text-yellow-700', icon: '⏳', label: 'Waiting for Confirmation' },
                      'Completed': { bg: 'bg-blue-50 border-blue-300',    badge: 'bg-blue-100 text-blue-700',  icon: '✔️', label: 'Completed' },
                    };
                    const sc = myEntry ? (statusColors[myEntry.status] || statusColors['Waiting']) : null;

                    return (
                      <div className="space-y-6">
                        {/* Clinic-wide stats — totals only, no names */}
                        <div className="bg-white rounded-xl shadow-md p-6">
                          <h2 className="text-xl font-bold text-gray-800 mb-1">Clinic Queue Status</h2>
                          <p className="text-sm text-gray-500 mb-4">Live slot availability at the clinic today</p>
                          <div className="grid grid-cols-3 gap-4">
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Priority Cases</p>
                              <p className="text-3xl font-bold text-red-600">{queue.filter(p => p.priority === 'Priority Case' && p.status !== 'Cancelled' && p.status !== 'Rejected').length}</p>
                            </div>
                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
                              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Urgent</p>
                              <p className="text-3xl font-bold text-orange-600">{queue.filter(p => p.priority === 'Urgent' && p.status !== 'Cancelled' && p.status !== 'Rejected').length}</p>
                            </div>
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Regular</p>
                              <p className="text-3xl font-bold text-green-600">{queue.filter(p => p.priority === 'Regular' && p.status !== 'Cancelled' && p.status !== 'Rejected').length}</p>
                            </div>
                          </div>
                          <p className="text-xs text-gray-400 mt-3 text-center">
                            Total in queue: {queue.filter(q => q.status !== 'Cancelled' && q.status !== 'Rejected').length} patient{queue.filter(q => q.status !== 'Cancelled' && q.status !== 'Rejected').length !== 1 ? 's' : ''}
                          </p>
                        </div>

                        {/* My Appointment Status */}
                        <div className="bg-white rounded-xl shadow-md p-6">
                          <h2 className="text-xl font-bold text-gray-800 mb-1">My Appointment Status</h2>
                          <p className="text-sm text-gray-500 mb-4">
                            {myEntries.length > 1
                              ? `You have ${myEntries.length} active bookings`
                              : 'Your current booking with the clinic'
                            }
                          </p>

                          {myEntries.length === 0 ? (
                            <div className="text-center py-10">
                              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                <Calendar className="w-8 h-8 text-purple-400" />
                              </div>
                              <p className="text-gray-600 font-medium">No active appointment</p>
                              <p className="text-sm text-gray-400 mt-1">You have no current booking in the queue.</p>
                              <button
                                onClick={() => setResidentView('booking')}
                                className="mt-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:from-purple-700 hover:to-pink-700 transition-all"
                              >
                                Book an Appointment
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-6">
                              {myEntries.map((myEntry) => {
                                const queuePosition = queue
                                  .filter(q => q.status !== 'Cancelled' && q.status !== 'Rejected')
                                  .findIndex(q => q.id === myEntry.id) + 1;
                                const sc = statusColors[myEntry.status] || statusColors['Waiting'];
                                return (
                            <div key={myEntry.id} className={`border-2 rounded-xl p-5 ${sc.bg}`}>
                              {/* BIG QUEUE NUMBER */}
                              {myEntry.queueNumber && myEntry.status !== 'Rejected' && myEntry.status !== 'Completed' ? (
                                <div className="flex flex-col items-center justify-center bg-white border-2 rounded-2xl py-5 mb-4" style={{borderColor:'var(--ht-primary)'}}>
                                  <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{color:'var(--ht-primary)'}}>
                                    {lang === 'fil' ? 'Iyong Numero sa Pila' : 'Your Queue Number'}
                                  </p>
                                  <p className="font-black leading-none" style={{fontSize:'5rem', color:'var(--ht-primary)'}}>
                                    {String(myEntry.queueNumber).padStart(3, '0')}
                                  </p>
                                  {/* Date, Time and Patient ID */}
                                  <div className="flex items-center gap-4 mt-3 px-4">
                                    <div className="text-center">
                                      <p className="text-xs text-gray-400 uppercase tracking-wide">{lang === 'fil' ? 'Petsa' : 'Date'}</p>
                                      <p className="text-sm font-semibold text-gray-700">
                                        {myEntry.appointmentDate
                                          ? new Date(myEntry.appointmentDate + 'T00:00:00').toLocaleDateString('en-PH', {month:'short', day:'numeric', year:'numeric'})
                                          : new Date(myEntry.timeQueued).toLocaleDateString('en-PH', {month:'short', day:'numeric', year:'numeric'})
                                        }
                                      </p>
                                    </div>
                                    <div className="w-px h-8 bg-gray-200"></div>
                                    <div className="text-center">
                                      <p className="text-xs text-gray-400 uppercase tracking-wide">{lang === 'fil' ? 'Oras' : 'Time'}</p>
                                      <p className="text-sm font-semibold text-gray-700">
                                        {myEntry.appointmentTime ? (() => {
                                          const [h, m] = myEntry.appointmentTime.split(':').map(Number);
                                          const ampm = h >= 12 ? 'PM' : 'AM';
                                          return `${h % 12 || 12}:${String(m).padStart(2,'0')} ${ampm}`;
                                        })() : '—'}
                                      </p>
                                    </div>
                                    <div className="w-px h-8 bg-gray-200"></div>
                                    <div className="text-center">
                                      <p className="text-xs text-gray-400 uppercase tracking-wide">Patient ID</p>
                                      <p className="text-sm font-semibold text-gray-700">{myEntry.patientId || '—'}</p>
                                    </div>
                                  </div>
                                  {myEntry.status === 'In Progress' && (
                                    <span className="mt-3 bg-green-500 text-white text-xs font-bold px-4 py-1 rounded-full animate-pulse">
                                      🔔 {lang === 'fil' ? 'Ikaw na ang susunod! Pumunta na sa window.' : 'Your turn! Please proceed to the window.'}
                                    </span>
                                  )}
                                  {myEntry.status !== 'In Progress' && queuePosition && (
                                    <p className="mt-2 text-xs text-gray-400">
                                      {lang === 'fil' ? `Posisyon sa pila: #${queuePosition}` : `Position in queue: #${queuePosition}`}
                                    </p>
                                  )}
                                </div>
                              ) : myEntry.status === 'Waiting' && !myEntry.queueNumber ? (
                                /* Pending approval — no queue number yet */
                                <div className="flex flex-col items-center justify-center bg-amber-50 border-2 border-amber-300 rounded-2xl py-6 mb-4">
                                  <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-3">
                                    <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                  </div>
                                  <p className="text-sm font-bold text-amber-700 uppercase tracking-wide">
                                    {lang === 'fil' ? 'Naghihintay ng Aprubahan' : 'Pending Approval'}
                                  </p>
                                  <p className="text-xs text-amber-600 mt-1 text-center px-4">
                                    {lang === 'fil'
                                      ? 'Ang iyong booking ay naghihintay ng pagsusuri ng klinika. Makakatanggap ka ng queue number kapag naaprobahan na.'
                                      : 'Your booking is awaiting clinic review. Your queue number will be assigned once the clinic accepts your appointment.'
                                    }
                                  </p>
                                  <div className="mt-3 text-xs text-amber-500">
                                    📅 {myEntry.appointmentDate ? new Date(myEntry.appointmentDate + 'T00:00:00').toLocaleDateString('en-PH', {weekday:'short', month:'short', day:'numeric', year:'numeric'}) : '—'}
                                    {myEntry.appointmentTime ? ` · ${(() => { const [h,m] = myEntry.appointmentTime.split(':').map(Number); return `${h%12||12}:${String(m).padStart(2,'0')} ${h>=12?'PM':'AM'}`; })()}` : ''}
                                  </div>
                                </div>
                              ) : null}

                              {/* Status badge */}
                              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-xl">{sc.icon}</span>
                                  <span className={`px-3 py-1 rounded-full text-sm font-bold border ${sc.badge}`}>
                                    {sc.label}
                                  </span>
                                </div>
                              </div>

                              {/* Patient + service info */}
                              <div className="mb-4">
                                <p className="text-lg font-bold text-gray-800">{myEntry.name}</p>
                                <p className="text-sm text-gray-500">Patient ID: {myEntry.patientId}</p>
                                <p className="text-sm text-gray-600 mt-1">
                                  <span className="font-medium">Service:</span> {myEntry.service}
                                  <span className="mx-2 text-gray-300">|</span>
                                  <span className="font-medium">Priority:</span> {myEntry.priority}
                                </p>
                              </div>

                              {/* Appointment date/time box */}
                              {apptDateStr ? (
                                <div className="flex items-center gap-3 bg-white rounded-xl border border-blue-200 px-4 py-3 mb-4">
                                  <span className="text-2xl">📅</span>
                                  <div>
                                    <p className="text-xs text-blue-500 font-bold uppercase tracking-wide">Scheduled Appointment</p>
                                    <p className="text-base font-bold text-gray-800">{apptDateStr}</p>
                                    <p className="text-sm text-blue-700 font-semibold">
                                      🕐 {apptSlot ? `${apptSlot.label} (Slot ${apptSlot.slot})` : myEntry.appointmentTime}
                                    </p>
                                  </div>
                                </div>
                              ) : null}

                              {/* Rejection reason */}
                              {myEntry.status === 'Rejected' && myEntry.rejectedReason && (
                                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
                                  <p className="text-xs font-bold text-red-600 uppercase tracking-wide mb-1">Reason for Rejection</p>
                                  <p className="text-sm text-red-700">{myEntry.rejectedReason}</p>
                                  <p className="text-xs text-gray-400 mt-2">
                                    Please visit the clinic or contact staff to reschedule.
                                  </p>
                                </div>
                              )}

                              <p className="text-xs text-gray-400">Booked on: {new Date(myEntry.timeQueued).toLocaleString('en-PH')}</p>
                            </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* My Appointments View */}
                  {residentView === 'appointments' && (
                    <div className="space-y-6">
                      <div className="bg-white rounded-xl shadow-md p-6">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
                          <div>
                            <h2 className="text-xl font-bold text-gray-800">My Appointments</h2>
                            <p className="text-sm text-gray-500 mt-1">Manage, reschedule, or cancel your booked appointments</p>
                          </div>
                          <div className="flex items-center space-x-3">
                            <div className="relative">
                              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                              <input
                                type="text"
                                value={appointmentSearch}
                                onChange={(e) => setAppointmentSearch(e.target.value)}
                                placeholder="Search by name, ID, or service..."
                                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm w-64"
                              />
                            </div>
                            <button
                              onClick={() => setResidentView('booking')}
                              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:from-purple-700 hover:to-pink-700 transition-all flex items-center space-x-1"
                            >
                              <Calendar className="w-4 h-4" />
                              <span>New Booking</span>
                            </button>
                          </div>
                        </div>

                        {/* Summary Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                            <p className="text-2xl font-bold text-blue-600">{getMyAppointments().length}</p>
                            <p className="text-xs text-gray-600">Total Booked</p>
                          </div>
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
                            <p className="text-2xl font-bold text-yellow-600">{getMyAppointments().filter(q => q.status === 'Waiting').length}</p>
                            <p className="text-xs text-gray-600">Waiting</p>
                          </div>
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                            <p className="text-2xl font-bold text-green-600">{getMyAppointments().filter(q => q.status === 'Completed').length}</p>
                            <p className="text-xs text-gray-600">Completed</p>
                          </div>
                          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                            <p className="text-2xl font-bold text-red-600">{getMyAppointments().filter(q => q.status === 'Cancelled').length}</p>
                            <p className="text-xs text-gray-600">Cancelled</p>
                          </div>
                        </div>

                        {/* Appointments List */}
                        {getMyAppointments().length === 0 ? (
                          <div className="text-center py-12 text-gray-500">
                            <Calendar className="w-16 h-16 mx-auto mb-3 text-gray-300" />
                            <p className="text-lg font-medium">No appointments found</p>
                            <p className="text-sm mt-1">Book a new appointment to get started</p>
                            <button
                              onClick={() => setResidentView('booking')}
                              className="mt-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-2 rounded-lg text-sm font-semibold hover:from-purple-700 hover:to-pink-700 transition-all"
                            >
                              Book Appointment
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {getMyAppointments().map((item) => (
                              <div key={item.id} className={`border rounded-xl overflow-hidden transition-all hover:shadow-lg ${
                                item.status === 'Cancelled' ? 'bg-gray-50 border-gray-200 opacity-75' :
                                item.status === 'Completed' ? 'bg-green-50 border-green-200' :
                                item.status === 'In Progress' ? 'bg-blue-50 border-blue-200' :
                                `${priorityLevels[item.priority]?.bgLight || 'bg-white'} ${priorityLevels[item.priority]?.border || 'border-gray-200'}`
                              }`}>
                                {/* Card Header */}
                                <div className="px-5 py-4">
                                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                                    <div className="flex-1">
                                      <div className="flex items-center flex-wrap gap-2 mb-2">
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${
                                          item.status === 'Cancelled' ? 'bg-gray-400' :
                                          item.status === 'Completed' ? 'bg-green-500' :
                                          item.status === 'In Progress' ? 'bg-blue-500' :
                                          priorityLevels[item.priority]?.color || 'bg-gray-500'
                                        }`}>
                                          {item.priority}
                                        </span>
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                          item.status === 'Waiting' ? 'bg-yellow-100 text-yellow-700' :
                                          item.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                                          item.status === 'Completed' ? 'bg-green-100 text-green-700' :
                                          'bg-gray-100 text-gray-600'
                                        }`}>
                                          {item.status}
                                        </span>
                                        {item.selfBooked && (
                                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-600">
                                            Self-Booked
                                          </span>
                                        )}
                                      </div>
                                      <h3 className="font-bold text-gray-800 text-lg">{item.name}</h3>
                                      <p className="text-sm text-gray-500">Patient ID: {item.patientId}</p>
                                    </div>

                                    {/* Action Buttons - Only show for Waiting status */}
                                    {item.status === 'Waiting' && (
                                      <div className="flex items-center gap-2 flex-shrink-0">
                                        <button
                                          onClick={() => openEditAppointment(item, 'edit')}
                                          className="flex items-center space-x-1.5 px-3 py-2 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg text-sm font-medium hover:bg-blue-100 transition-all"
                                          title="Edit appointment details"
                                        >
                                          <Edit className="w-4 h-4" />
                                          <span>Edit</span>
                                        </button>
                                        <button
                                          onClick={() => openEditAppointment(item, 'reschedule')}
                                          className="flex items-center space-x-1.5 px-3 py-2 bg-orange-50 text-orange-600 border border-orange-200 rounded-lg text-sm font-medium hover:bg-orange-100 transition-all"
                                          title="Reschedule to a different date/time"
                                        >
                                          <Calendar className="w-4 h-4" />
                                          <span>Reschedule</span>
                                        </button>
                                        <button
                                          onClick={() => setShowCancelConfirm(item.id)}
                                          className="flex items-center space-x-1.5 px-3 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-medium hover:bg-red-100 transition-all"
                                          title="Cancel this appointment"
                                        >
                                          <Trash className="w-4 h-4" />
                                          <span>Cancel</span>
                                        </button>
                                      </div>
                                    )}
                                  </div>

                                  {/* Appointment Details */}
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4 text-sm">
                                    <div className="flex items-start space-x-2">
                                      <Calendar className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                      <div>
                                        <p className="text-gray-500 text-xs">Date & Time</p>
                                        <p className="font-medium text-gray-700">
                                          {item.appointmentDate ? new Date(item.appointmentDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) : 'Not set'}
                                          {item.appointmentTime && (
                                            <span className="ml-1 text-purple-600">
                                              at {new Date('2000-01-01T' + item.appointmentTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                                            </span>
                                          )}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-start space-x-2">
                                      <Activity className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                      <div>
                                        <p className="text-gray-500 text-xs">Service</p>
                                        <p className="font-medium text-gray-700">{item.service}</p>
                                        <p className="text-xs text-gray-400">{item.serviceCategory}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-start space-x-2">
                                      <FileText className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                      <div>
                                        <p className="text-gray-500 text-xs">Reason for Visit</p>
                                        <p className="font-medium text-gray-700">{item.chiefComplaint || 'N/A'}</p>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                                    <p className="text-xs text-gray-400">
                                      Booked: {new Date(item.timeQueued).toLocaleString()}
                                      {item.updatedAt && (
                                        <span className="ml-2 text-orange-400">• Updated: {new Date(item.updatedAt).toLocaleString()}</span>
                                      )}
                                    </p>
                                    {item.status === 'Cancelled' && item.cancelledAt && (
                                      <p className="text-xs text-red-400">Cancelled: {new Date(item.cancelledAt).toLocaleString()}</p>
                                    )}
                                  </div>
                                </div>

                                {/* Cancel Confirmation Inline */}
                                {showCancelConfirm === item.id && (
                                  <div className="bg-red-50 border-t border-red-200 px-5 py-4">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center space-x-2">
                                        <AlertCircle className="w-5 h-5 text-red-500" />
                                        <p className="text-sm font-medium text-red-700">Are you sure you want to cancel this appointment?</p>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <button
                                          onClick={() => setShowCancelConfirm(null)}
                                          className="px-4 py-1.5 bg-white border border-gray-300 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-all"
                                        >
                                          Keep It
                                        </button>
                                        <button
                                          onClick={() => cancelAppointment(item.id)}
                                          className="px-4 py-1.5 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-all"
                                        >
                                          Yes, Cancel
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Edit / Reschedule Modal */}
                      {editingAppointment && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                            {/* Modal Header */}
                            <div className={`px-6 py-4 rounded-t-2xl ${
                              editMode === 'reschedule' 
                                ? 'bg-gradient-to-r from-orange-500 to-amber-500' 
                                : 'bg-gradient-to-r from-blue-600 to-indigo-600'
                            } text-white`}>
                              <div className="flex items-center justify-between">
                                <div>
                                  <h3 className="text-lg font-bold">
                                    {editMode === 'reschedule' ? 'Reschedule Appointment' : 'Edit Appointment'}
                                  </h3>
                                  <p className="text-sm opacity-90">{editingAppointment.name} — {editingAppointment.patientId}</p>
                                </div>
                                <button
                                  onClick={() => { setEditingAppointment(null); setEditMode(''); }}
                                  className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            </div>

                            {/* Modal Body */}
                            <div className="p-6 space-y-4">
                              {/* Date & Time — always shown */}
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    `${t('appointmentDate')} `}<span className="text-red-500">*</span>
                                  </label>
                                  <input
                                    type="date"
                                    value={editingAppointment.newAppointmentDate}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      if (val) {
                                        const day = new Date(val + 'T00:00:00').getDay();
                                        if (day === 0 || day === 6) { alert('⚠️ Weekdays only (Mon–Fri).'); return; }
                                        if (isPHHoliday(val)) { alert('⚠️ ' + getPHHolidayName(val) + ' is a public holiday.'); return; }
                                      }
                                      setEditingAppointment({...editingAppointment, newAppointmentDate: val});
                                    }}
                                    min={getLocalDateStr()}
                                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    {t('appointmentTime')} <span className="text-red-500">*</span>
                                  </label>
                                  {(() => {
                                    const booked = getBookedSlots(editingAppointment.newAppointmentDate, editingAppointment.id);
                                    return (
                                      <select
                                        value={editingAppointment.newAppointmentTime}
                                        onChange={(e) => setEditingAppointment({...editingAppointment, newAppointmentTime: e.target.value})}
                                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                      >
                                        <option value="">{t('selectTimeSlot')}</option>
                                        {CLINIC_SLOTS.map(s => {
                                          const isBooked = booked.has(s.value);
                                          const isLunch  = s.lunch;
                                          const now = new Date();
                                          const localToday = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
                                          const isToday = editingAppointment.newAppointmentDate === localToday;
                                          const isPast = isToday && (() => {
                                            const [h] = s.value.split(':').map(Number);
                                            return now.getHours() >= h;
                                          })();
                                          const disabled = isBooked || isLunch || isPast;
                                          return (
                                            <option key={s.value} value={s.value} disabled={disabled}>
                                              {`Slot ${s.slot}: ${s.label}${isLunch ? ' 🍽 Lunch Break' : isPast ? '' : isBooked ? ' ✗ Fully Booked' : ''}`}
                                            </option>
                                          );
                                        })}
                                      </select>
                                    );
                                  })()}
                                </div>
                              </div>

                              {/* Service fields — only for full edit */}
                              {editMode === 'edit' && (
                                <>
                                  <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                                      Service Category <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                      value={editingAppointment.newServiceCategory}
                                      onChange={(e) => setEditingAppointment({
                                        ...editingAppointment,
                                        newServiceCategory: e.target.value,
                                        newServiceType: '',
                                        newPriorityLevel: ''
                                      })}
                                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    >
                                      <option value="">{t('selectServiceCategory')}</option>
                                      {Object.keys(SERVICE_CATEGORIES).map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                      ))}
                                    </select>
                                  </div>

                                  <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                                      Service Type <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                      value={editingAppointment.newServiceType}
                                      onChange={(e) => {
                                        const svc = SERVICE_CATEGORIES[editingAppointment.newServiceCategory]?.services.find(s => s.name === e.target.value);
                                        setEditingAppointment({
                                          ...editingAppointment,
                                          newServiceType: e.target.value,
                                          newPriorityLevel: svc?.priority || editingAppointment.newPriorityLevel
                                        });
                                      }}
                                      disabled={!editingAppointment.newServiceCategory}
                                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100"
                                    >
                                      <option value="">{editingAppointment.newServiceCategory ? 'Select service type' : 'Select a category first'}</option>
                                      {editingAppointment.newServiceCategory && SERVICE_CATEGORIES[editingAppointment.newServiceCategory]?.services.map(s => (
                                        <option key={s.name} value={s.name}>{s.name}</option>
                                      ))}
                                    </select>
                                  </div>

                                  <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">{t('priorityLevel')}</label>
                                    <select
                                      value={editingAppointment.newPriorityLevel}
                                      onChange={(e) => setEditingAppointment({...editingAppointment, newPriorityLevel: e.target.value})}
                                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    >
                                      <option value="Priority Case">Priority Case</option>
                                      <option value="Urgent">Urgent</option>
                                      <option value="Regular">Regular</option>
                                    </select>
                                  </div>
                                </>
                              )}

                              {/* Reason for Visit */}
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                  Reason for Visit
                                </label>
                                <textarea
                                  value={editingAppointment.newNotes}
                                  onChange={(e) => setEditingAppointment({...editingAppointment, newNotes: e.target.value})}
                                  rows={3}
                                  placeholder="Describe the reason for your visit..."
                                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                                />
                              </div>

                              {/* Info box for reschedule */}
                              {editMode === 'reschedule' && (
                                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex items-start space-x-2">
                                  <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                                  <div className="text-sm text-orange-700">
                                    <p className="font-medium">Rescheduling Info</p>
                                    <p className="mt-1">Your queue position may change based on the new date. The service and priority level will remain the same.</p>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Modal Footer */}
                            <div className="px-6 py-4 border-t bg-gray-50 rounded-b-2xl flex gap-3">
                              <button
                                onClick={() => { setEditingAppointment(null); setEditMode(''); }}
                                className="flex-1 bg-white border-2 border-gray-300 text-gray-700 py-2.5 rounded-lg font-semibold hover:bg-gray-50 transition-all"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={saveEditedAppointment}
                                className={`flex-1 text-white py-2.5 rounded-lg font-semibold transition-all transform hover:scale-[1.02] shadow-lg ${
                                  editMode === 'reschedule' 
                                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600' 
                                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
                                }`}
                              >
                                {editMode === 'reschedule' ? 'Confirm Reschedule' : 'Save Changes'}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Booking View */}
                  {residentView === 'booking' && (() => {
                    // For logged-in residents, always use their account data directly
                    const myPatientRecord = currentUser ? (
                      registeredPatients.find(p => {
                        if (currentUser.username === p.patientId) return true;
                        const fn = (p.firstName || '').toLowerCase().trim();
                        const ln = (p.lastName || '').toLowerCase().trim();
                        const full = (currentUser.fullName || '').toLowerCase().trim();
                        return full.includes(fn) && full.includes(ln) && fn && ln;
                      }) || {
                        firstName: (currentUser.fullName || '').split(' ')[0] || currentUser.username,
                        lastName: (currentUser.fullName || '').split(' ').slice(-1)[0] || '',
                        fullName: currentUser.fullName || currentUser.username,
                        _fromAccount: true
                      }
                    ) : null;

                    // When booking for someone else, treat as no patient record
                    const effectivePatientRecord = bookingFor === 'myself' ? myPatientRecord : null;

                    return (
                    <div className="max-w-2xl mx-auto p-4">
                      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-5">
                          <h2 className="text-2xl font-bold text-white mb-1">{t('bookAppointment')}</h2>
                          <p className="text-white/90 text-sm">
                            {bookingFor === 'someone'
                              ? '👨‍👩‍👧 Booking on behalf of someone else'
                              : effectivePatientRecord
                                ? '📋 Schedule your visit — your details are already on file'
                                : '✨ No Patient ID required - Just your name!'}
                          </p>
                        </div>

                        <div className="p-6 space-y-6">

                          {/* ── WHO IS THIS FOR? SELECTOR ── */}
                          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                            <p className="text-sm font-bold text-gray-700 mb-3">Who is this appointment for?</p>
                            <div className="grid grid-cols-2 gap-3">
                              <button
                                type="button"
                                onClick={() => {
                                  setBookingFor('myself');
                                  setResidentBooking(b => ({...b, lastName:'', firstName:'', middleName:'', dateOfBirth:'', sex:'', civilStatus:'', address:'', contactNumber:'', occupation:'', emergencyContactPerson:'', emergencyContactNumber:'', allergies:'', chronicConditions:'', currentMedications:''}));
                                }}
                                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${bookingFor === 'myself' ? 'border-purple-500 bg-purple-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold ${bookingFor === 'myself' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                                  {(currentUser?.fullName || currentUser?.username || '?')[0].toUpperCase()}
                                </div>
                                <div className="text-center">
                                  <p className={`text-sm font-bold ${bookingFor === 'myself' ? 'text-purple-700' : 'text-gray-700'}`}>👤 Myself</p>
                                  <p className="text-xs text-gray-500 mt-0.5">{currentUser?.fullName || currentUser?.username}</p>
                                </div>
                                {bookingFor === 'myself' && <span className="text-xs text-purple-600 font-semibold">✓ Selected</span>}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setBookingFor('someone');
                                  setResidentBooking(b => ({...b, lastName:'', firstName:'', middleName:'', dateOfBirth:'', sex:'', civilStatus:'', address:'', contactNumber:'', occupation:'', emergencyContactPerson:'', emergencyContactNumber:'', allergies:'', chronicConditions:'', currentMedications:''}));
                                }}
                                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${bookingFor === 'someone' ? 'border-pink-500 bg-pink-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl ${bookingFor === 'someone' ? 'bg-pink-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                                  👨‍👩‍👧
                                </div>
                                <div className="text-center">
                                  <p className={`text-sm font-bold ${bookingFor === 'someone' ? 'text-pink-700' : 'text-gray-700'}`}>Someone Else</p>
                                  <p className="text-xs text-gray-500 mt-0.5">Book for a family member or patient</p>
                                </div>
                                {bookingFor === 'someone' && <span className="text-xs text-pink-600 font-semibold">✓ Selected</span>}
                              </button>
                            </div>
                            {bookingFor === 'someone' && (
                              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-3">
                                ⚠️ You are booking on behalf of someone else. This will appear in your appointments as a proxy booking. Please fill in their personal details below.
                              </p>
                            )}
                          </div>

                          {/* ── IF PATIENT ON FILE: show name card (only for myself) ── */}
                          {effectivePatientRecord ? (() => {
                            const rec = effectivePatientRecord;
                            const missingFields = [];
                            if (!rec.dateOfBirth) missingFields.push(lang === 'fil' ? 'Petsa ng Kapanganakan' : 'Date of Birth');
                            const isComplete = missingFields.length === 0;
                            return (
                              <div>
                                <div className="flex items-center justify-between bg-purple-50 border border-purple-200 rounded-xl px-4 py-3">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-lg">
                                      {(rec.firstName || currentUser?.fullName || '?')[0]?.toUpperCase()}
                                    </div>
                                    <div>
                                      <p className="text-xs font-semibold text-purple-500 uppercase tracking-wide mb-0.5">Booking as</p>
                                      <p className="font-bold text-gray-800">
                                        {rec._fromAccount
                                          ? (currentUser?.fullName || currentUser?.username)
                                          : `${rec.firstName} ${rec.lastName}`}
                                      </p>
                                    </div>
                                  </div>
                                  {isComplete
                                    ? <span className="text-xs text-green-600 font-semibold bg-green-50 border border-green-200 rounded-full px-3 py-1">✓ {lang === 'fil' ? 'Kumpleto ang impormasyon' : 'Info on file'}</span>
                                    : <span className="text-xs text-amber-600 font-semibold bg-amber-50 border border-amber-200 rounded-full px-3 py-1">⚠️ {lang === 'fil' ? 'Hindi kumpleto' : 'Incomplete'}</span>
                                  }
                                </div>
                                {!isComplete && (
                                  <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
                                    {lang === 'fil'
                                      ? `Mangyaring i-update ang iyong profile: ${missingFields.join(', ')}. Makipag-ugnayan sa klinika o i-update sa inyong profile.`
                                      : `Please update your profile — missing: ${missingFields.join(', ')}. Contact the clinic or update your profile before booking.`
                                    }
                                  </div>
                                )}
                              </div>
                            );
                          })() : (
                            /* ── NO RECORD or booking for someone else: show full form ── */
                            <div>
                              <h3 className="text-base font-bold text-gray-800 mb-3 pb-2 border-b border-gray-200">Personal Information</h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-semibold text-gray-700 mb-1">Last Name <span className="text-red-500">*</span></label>
                                  <input type="text" value={residentBooking.lastName}
                                    onChange={(e) => setResidentBooking({...residentBooking, lastName: e.target.value})}
                                    placeholder="Dela Cruz"
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all" />
                                </div>
                                <div>
                                  <label className="block text-sm font-semibold text-gray-700 mb-1">First Name <span className="text-red-500">*</span></label>
                                  <input type="text" value={residentBooking.firstName}
                                    onChange={(e) => setResidentBooking({...residentBooking, firstName: e.target.value})}
                                    placeholder="Juan"
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all" />
                                </div>
                                <div>
                                  <label className="block text-sm font-semibold text-gray-700 mb-1">Middle Name</label>
                                  <input type="text" value={residentBooking.middleName}
                                    onChange={(e) => setResidentBooking({...residentBooking, middleName: e.target.value})}
                                    placeholder="Santos"
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all" />
                                </div>
                                <div>
                                  <label className="block text-sm font-semibold text-gray-700 mb-1">Date of Birth <span className="text-red-500">*</span></label>
                                  <input type="date" value={residentBooking.dateOfBirth}
                                    onChange={(e) => setResidentBooking({...residentBooking, dateOfBirth: e.target.value})}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all" />
                                </div>
                                <div>
                                  <label className="block text-sm font-semibold text-gray-700 mb-1">Sex <span className="text-red-500">*</span></label>
                                  <select value={residentBooking.sex}
                                    onChange={(e) => setResidentBooking({...residentBooking, sex: e.target.value})}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all">
                                    <option value="">Select</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-sm font-semibold text-gray-700 mb-1">Civil Status</label>
                                  <select value={residentBooking.civilStatus}
                                    onChange={(e) => {
                                      if (!validateCivilStatus(residentBooking.dateOfBirth, e.target.value)) {
                                        alert('⚠️ Under RA 11596 (Prohibition of Child Marriage Act), the minimum age for marriage in the Philippines is 18 years old. Please select Single for patients under 18.');
                                        return;
                                      }
                                      setResidentBooking({...residentBooking, civilStatus: e.target.value});
                                    }}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all">
                                    <option value="">Select</option>
                                    <option value="Single">Single</option>
                                    <option value="Married">Married</option>
                                    <option value="Widowed">Widowed</option>
                                    <option value="Separated">Separated</option>
                                  </select>
                                </div>
                              </div>

                              <h3 className="text-base font-bold text-gray-800 mt-5 mb-3 pb-2 border-b border-gray-200">Contact Information</h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                  <label className="block text-sm font-semibold text-gray-700 mb-1">Address <span className="text-red-500">*</span></label>
                                  <input type="text" value={residentBooking.address}
                                    onChange={(e) => setResidentBooking({...residentBooking, address: e.target.value})}
                                    placeholder="Barangay, City/Municipality"
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all" />
                                </div>
                                <div>
                                  <label className="block text-sm font-semibold text-gray-700 mb-1">Contact Number <span className="text-red-500">*</span></label>
                                  <input type="text" value={residentBooking.contactNumber}
                                    onChange={(e) => setResidentBooking({...residentBooking, contactNumber: sanitizePhone(e.target.value).slice(0,12)})}
                                    placeholder="09XXXXXXXXX or 8-digit landline" maxLength={12}
                                    className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all ${residentBooking.contactNumber && validateContactNumber(residentBooking.contactNumber).msg ? 'border-red-400 bg-red-50' : 'border-gray-300'}`} />
                                  {residentBooking.contactNumber && validateContactNumber(residentBooking.contactNumber).msg && (
                                    <p className="text-xs text-red-500 mt-1">{validateContactNumber(residentBooking.contactNumber).msg}</p>
                                  )}
                                  {residentBooking.contactNumber && !validateContactNumber(residentBooking.contactNumber).msg && (
                                    <p className="text-xs text-green-600 mt-1">✓ Valid number</p>
                                  )}
                                </div>
                                <div>
                                  <label className="block text-sm font-semibold text-gray-700 mb-1">Occupation</label>
                                  <input type="text" value={residentBooking.occupation}
                                    onChange={(e) => setResidentBooking({...residentBooking, occupation: e.target.value})}
                                    placeholder="e.g. Teacher, Farmer"
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all" />
                                </div>
                                <div>
                                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    PWD ID Number <span className="text-gray-400 font-normal">(optional)</span>
                                  </label>
                                  <input type="text" value={residentBooking.pwdId || ''}
                                    onChange={(e) => setResidentBooking({...residentBooking, pwdId: e.target.value})}
                                    placeholder="e.g. PWD-2024-XXXXX"
                                    className="w-full px-4 py-2.5 border border-blue-200 bg-blue-50 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all" />
                                  <p className="text-xs text-blue-600 mt-1">♿ Auto-sets Priority Case in queue</p>
                                </div>
                              </div>

                              <h3 className="text-base font-bold text-gray-800 mt-5 mb-3 pb-2 border-b border-gray-200">Emergency Contact</h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-semibold text-gray-700 mb-1">Emergency Contact Person</label>
                                  <input type="text" value={residentBooking.emergencyContactPerson}
                                    onChange={(e) => setResidentBooking({...residentBooking, emergencyContactPerson: e.target.value})}
                                    placeholder="Full name"
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all" />
                                </div>
                                <div>
                                  <label className="block text-sm font-semibold text-gray-700 mb-1">Emergency Contact Number</label>
                                  <input type="text" value={residentBooking.emergencyContactNumber}
                                    onChange={(e) => setResidentBooking({...residentBooking, emergencyContactNumber: sanitizePhone(e.target.value).slice(0,12)})}
                                    placeholder="09XXXXXXXXX or 8-digit landline" maxLength={12}
                                    className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all ${residentBooking.emergencyContactNumber && validateContactNumber(residentBooking.emergencyContactNumber).msg ? 'border-red-400 bg-red-50' : 'border-gray-300'}`} />
                                  {residentBooking.emergencyContactNumber && validateContactNumber(residentBooking.emergencyContactNumber).msg && (
                                    <p className="text-xs text-red-500 mt-1">{validateContactNumber(residentBooking.emergencyContactNumber).msg}</p>
                                  )}
                                  {residentBooking.emergencyContactNumber && !validateContactNumber(residentBooking.emergencyContactNumber).msg && (
                                    <p className="text-xs text-green-600 mt-1">✓ Valid number</p>
                                  )}
                                </div>
                              </div>

                              <h3 className="text-base font-bold text-gray-800 mt-5 mb-3 pb-2 border-b border-gray-200">Medical Information</h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <div className="flex justify-between items-center mb-1"><label className="block text-sm font-semibold text-gray-700">Allergies</label><button type="button" onClick={() => setResidentBooking({...residentBooking, allergies: 'None'})} className="text-xs text-blue-500 hover:text-blue-700 font-medium">+ None</button></div>
                                  <input type="text" value={residentBooking.allergies}
                                    onChange={(e) => setResidentBooking({...residentBooking, allergies: e.target.value})}
                                    placeholder="e.g., Penicillin, Peanuts"
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all" />
                                </div>
                                <div className="md:col-span-2">
                                  <div className="flex justify-between items-center mb-1"><label className="block text-sm font-semibold text-gray-700">Chronic Conditions</label><button type="button" onClick={() => setResidentBooking({...residentBooking, chronicConditions: 'None'})} className="text-xs text-blue-500 hover:text-blue-700 font-medium">+ None</button></div>
                                  <input type="text" value={residentBooking.chronicConditions}
                                    onChange={(e) => setResidentBooking({...residentBooking, chronicConditions: e.target.value})}
                                    placeholder="e.g., Hypertension, Diabetes"
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all" />
                                </div>
                                <div className="md:col-span-2">
                                  <div className="flex justify-between items-center mb-1"><label className="block text-sm font-semibold text-gray-700">Current Medications</label><button type="button" onClick={() => setResidentBooking({...residentBooking, currentMedications: 'None'})} className="text-xs text-blue-500 hover:text-blue-700 font-medium">+ None</button></div>
                                  <textarea value={residentBooking.currentMedications}
                                    onChange={(e) => setResidentBooking({...residentBooking, currentMedications: e.target.value})}
                                    placeholder="List current medications"
                                    rows={2}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none" />
                                </div>
                              </div>
                            </div>
                          )}

                          {/* ── AVAILABLE DOCTORS TODAY ── */}
                          {(() => {
                            const availableDocs = doctors.filter(d => isDoctorAvailableToday(d));
                            if (availableDocs.length === 0) return null;
                            return (
                              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                                <p className="text-sm font-bold text-green-800 mb-3">👨‍⚕️ Available Doctors Today</p>
                                <div className="space-y-2">
                                  {availableDocs.map(doc => (
                                    <div key={doc.id} className="flex items-center gap-3 bg-white rounded-lg px-3 py-2 border border-green-100">
                                      <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                                        {doc.name.split(' ').slice(-1)[0][0]}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-800">{doc.name}</p>
                                        <p className="text-xs text-gray-500">{doc.specialty} · {getDoctorScheduleDisplay(doc)}</p>
                                      </div>
                                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold flex-shrink-0">✓ Available</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })()}

                          {/* ── APPOINTMENT SCHEDULE (always shown) ── */}
                          <div>
                            <h3 className="text-base font-bold text-gray-800 mb-3 pb-2 border-b border-gray-200">{t('appointmentSchedule')}</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">{t('appointmentDate')} <span className="text-red-500">*</span></label>
                                <input type="date" value={residentBooking.appointmentDate}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (val) {
                                      const day = new Date(val + 'T00:00:00').getDay();
                                      if (day === 0 || day === 6) {
                                        setResidentBooking({...residentBooking, appointmentDate: '', appointmentTime: ''});
                                        alert('⚠️ Weekdays only (Mon–Fri). Please select a weekday.');
                                        return;
                                      }
                                      // iOS ignores min attribute — validate past dates manually
                                      if (val < getLocalDateStr()) {
                                        setResidentBooking({...residentBooking, appointmentDate: '', appointmentTime: ''});
                                        alert('⚠️ Please select today or a future date.');
                                        return;
                                      }
                                    }
                                    setResidentBooking({...residentBooking, appointmentDate: val, appointmentTime: ''});
                                  }}
                                  min={getLocalDateStr()}
                                  className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all ${isPHHoliday(residentBooking.appointmentDate) ? 'border-red-400 bg-red-50' : 'border-gray-300'}`} />
                                <p className="text-xs text-gray-400 mt-1">📅 Weekdays only (Mon–Fri) · No bookings on PH holidays</p>
                                {isPHHoliday(residentBooking.appointmentDate) && (
                                  <p className="text-xs text-red-500 mt-1 font-medium">🚫 {getPHHolidayName(residentBooking.appointmentDate)} — Holiday, not bookable</p>
                                )}
                              </div>
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">{t('appointmentTime')} <span className="text-red-500">*</span></label>
                                <select value={residentBooking.appointmentTime}
                                  onChange={(e) => setResidentBooking({...residentBooking, appointmentTime: e.target.value})}
                                  disabled={!residentBooking.appointmentDate}
                                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed">
                                  <option value="">{t('selectTimeSlot')}</option>
                                  {CLINIC_SLOTS.filter(s => s.value !== '12:00').map(slot => {
                                    const isBooked = residentBooking.appointmentDate && getBookedSlots(residentBooking.appointmentDate).has(slot.value);
                                    const count = residentBooking.appointmentDate ? getSlotCount(residentBooking.appointmentDate, slot.value) : 0;
                                    const remaining = SLOT_CAPACITY - count;
                                    // Use local date (not UTC) for correct PH timezone comparison
                                    const now = new Date();
                                    const localToday = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
                                    const isToday = residentBooking.appointmentDate === localToday;
                                    const isPast = isToday && (() => {
                                      const [h] = slot.value.split(':').map(Number);
                                      // Disable if current hour >= slot start hour
                                      return now.getHours() >= h;
                                    })();
                                    const disabled = isBooked || isPast;
                                    return <option key={slot.value} value={slot.value} disabled={disabled}>
                                      {slot.label}{isBooked ? ' (Full)' : isPast ? '' : count > 0 ? ` (${remaining} slots left)` : ''}
                                    </option>;
                                  })}
                                </select>
                                <p className="text-xs text-gray-400 mt-1">🏥 Clinic hours: 8:00 AM – 5:00 PM | Lunch 12–1 PM blocked</p>
                              </div>
                              <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-gray-700 mb-1">{t('serviceCategory')} <span className="text-red-500">*</span></label>
                                <select value={residentBooking.serviceCategory}
                                  onChange={(e) => setResidentBooking({...residentBooking, serviceCategory: e.target.value, serviceType: '', priorityLevel: ''})}
                                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all">
                                  <option value="">{t('selectServiceCategory')}</option>
                                  {Object.keys(SERVICE_CATEGORIES).filter(cat => SERVICE_CATEGORIES[cat].enabled !== false).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                </select>
                              </div>
                              <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-gray-700 mb-1">{t('serviceType')} <span className="text-red-500">*</span></label>
                                <select value={residentBooking.serviceType}
                                  onChange={(e) => {
                                    const selectedService = SERVICE_CATEGORIES[residentBooking.serviceCategory]?.services.find(s => s.name === e.target.value);
                                    setResidentBooking({...residentBooking, serviceType: e.target.value, priorityLevel: selectedService?.priority || ''});
                                  }}
                                  disabled={!residentBooking.serviceCategory}
                                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed">
                                  <option value="">{residentBooking.serviceCategory ? t('selectServiceFirst') : t('selectServiceFirst')}</option>
                                  {residentBooking.serviceCategory && SERVICE_CATEGORIES[residentBooking.serviceCategory]?.services.filter(s => s.enabled !== false).map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                                </select>
                              </div>
                              <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Reason for Visit <span className="text-red-500">*</span></label>
                                <textarea value={residentBooking.notes}
                                  onChange={(e) => setResidentBooking({...residentBooking, notes: e.target.value})}
                                  rows={3}
                                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none" />
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex gap-3 mt-6">
                            <button
                              onClick={() => {
                                setResidentBooking({
                                  lastName: '', firstName: '', middleName: '',
                                  dateOfBirth: '', sex: '', civilStatus: '',
                                  address: '', contactNumber: '', occupation: '',
                                  emergencyContactPerson: '', emergencyContactNumber: '',
                                  allergies: '', chronicConditions: '', currentMedications: '',
                                  appointmentDate: '', appointmentTime: '',
                                  serviceCategory: '', serviceType: '', priorityLevel: '', notes: ''
                                });
                                setBookingFor('myself');
                                setResidentView('queue');
                              }}
                              className="flex-1 bg-white border-2 border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-all"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={submitResidentBooking}
                              disabled={isPHHoliday(residentBooking.appointmentDate)}
                              className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all transform hover:scale-[1.02] shadow-lg disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
                            >
                              {t('submitBooking')}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    );
                  })()}

                  {/* Visit History View */}
                  {residentView === 'history' && (() => {
                    const myVisits = getResidentVisitHistory();

                    const printMyHistory = () => {
                      const win = window.open('', '_blank');
                      win.document.write(`
                        <html><head><title>My Visit History - ${currentUser?.fullName || currentUser?.username}</title>
                        <style>
                          body { font-family: Arial, sans-serif; padding: 24px; color: #333; }
                          .header { border-bottom: 3px solid #cc0000; padding-bottom: 16px; margin-bottom: 20px; }
                          h1 { color: #cc0000; font-size: 22px; margin: 0; }
                          h2 { font-size: 13px; color: #555; margin: 4px 0 0; }
                          .patient-info { background: #f8f8f8; border: 1px solid #ddd; border-radius: 8px; padding: 14px; margin-bottom: 20px; }
                          .visit { border: 1px solid #e0e0e0; border-radius: 8px; padding: 14px; margin-bottom: 14px; page-break-inside: avoid; }
                          .visit-header { display: flex; justify-content: space-between; margin-bottom: 6px; }
                          .visit-service { font-weight: bold; font-size: 14px; color: #cc0000; }
                          .visit-date { font-size: 12px; color: #888; }
                          .visit-detail { font-size: 13px; margin: 3px 0; }
                          .badge { background: #cc0000; color: white; font-size: 11px; padding: 2px 8px; border-radius: 12px; }
                          .footer { margin-top: 30px; border-top: 1px solid #ddd; padding-top: 12px; font-size: 11px; color: #999; text-align: center; }
                        </style></head><body>
                        <div class="header">
                          <h1>HealthTrack</h1>
                          <h2>Patient Information System with Queueing</h2>
                          <h2>Barangay Upper Bicutan Health Clinics - City of Taguig</h2>
                          <h2 style="margin-top:10px;font-size:15px;color:#333;">My Visit History Report</h2>
                        </div>
                        <div class="patient-info">
                          <p><strong>Name:</strong> ${currentUser?.fullName || currentUser?.username}</p>
                          <p><strong>Total Visits:</strong> ${myVisits.length}</p>
                        </div>
                        ${myVisits.length === 0 ? '<p style="color:#999;text-align:center;">No visit records found.</p>' :
                          myVisits.map(v => `
                            <div class="visit">
                              <div class="visit-header">
                                <span class="visit-service">${v.service || 'N/A'}</span>
                                <span class="badge">${v.priority || 'Regular'}</span>
                              </div>
                              <p class="visit-date">📅 ${v.visitDate ? new Date(v.visitDate).toLocaleDateString('en-PH', {weekday:'long',year:'numeric',month:'long',day:'numeric'}) : 'N/A'}</p>
                              ${v.serviceCategory ? `<p class="visit-detail"><strong>Category:</strong> ${v.serviceCategory}</p>` : ''}
                              ${v.chiefComplaint ? `<p class="visit-detail"><strong>Reason for Visit:</strong> ${v.chiefComplaint}</p>` : ''}
                              ${v.diagnosis ? `<p class="visit-detail"><strong>Diagnosis:</strong> ${v.diagnosis}</p>` : ''}
                              ${v.treatment ? `<p class="visit-detail"><strong>Treatment:</strong> ${v.treatment}</p>` : ''}
                              ${v.attendedBy ? `<p class="visit-detail"><strong>Attended by:</strong> ${v.attendedBy}</p>` : ''}
                              ${v.notes ? `<p class="visit-detail"><strong>Notes:</strong> ${v.notes}</p>` : ''}
                            </div>`).join('')}
                        <div class="footer">
                          Printed on ${new Date().toLocaleDateString('en-PH', {year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'})} | HealthTrack — FOR CAPSTONE PROJECT USE ONLY
                        </div>
                        </body></html>`);
                      win.document.close();
                      win.focus();
                      setTimeout(() => win.print(), 500);
                    };

                    return (
                    <div className="space-y-4">
                      <div className="bg-white rounded-xl shadow-md p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h2 className="text-xl font-bold text-gray-800">My Visit History</h2>
                            <p className="text-sm text-gray-500 mt-0.5">All your completed clinic visits and transactions</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="bg-gray-100 text-gray-600 text-xs px-3 py-1.5 rounded-full font-medium">{myVisits.length} record{myVisits.length !== 1 ? 's' : ''}</span>
                            <button onClick={printMyHistory}
                              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors">
                              🖨️ Print / Save PDF
                            </button>
                          </div>
                        </div>

                        {myVisits.length === 0 ? (
                          <div className="text-center py-12">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                              <FileText className="w-8 h-8 text-gray-300" />
                            </div>
                            <p className="text-gray-500 font-medium">No visit history yet</p>
                            <p className="text-gray-400 text-sm mt-1">Your completed clinic visits will appear here automatically.</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {myVisits.map((visit, idx) => (
                              <div key={visit.id || idx} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-3">
                                  <div>
                                    <p className="font-semibold text-gray-800">{visit.service}</p>
                                    <p className="text-sm text-gray-500">{visit.serviceCategory && <span className="mr-2 text-purple-600">{visit.serviceCategory}</span>}{new Date(visit.visitDate).toLocaleDateString('en-PH', { year:'numeric', month:'long', day:'numeric' })}</p>
                                  </div>
                                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${priorityLevels[visit.priority]?.color || 'bg-gray-400'} text-white flex-shrink-0`}>
                                    {visit.priority}
                                  </span>
                                </div>
                                <div className="grid md:grid-cols-2 gap-3 text-sm">
                                  <div className="space-y-1">
                                    <p className="text-gray-600"><span className="font-medium text-gray-700">Reason for Visit:</span> {visit.chiefComplaint || 'N/A'}</p>
                                    <p className="text-gray-600"><span className="font-medium text-gray-700">Time Served:</span> {visit.timeServed ? new Date(visit.timeServed).toLocaleTimeString('en-PH', {hour:'2-digit', minute:'2-digit'}) : 'N/A'}</p>
                                    <p className="text-gray-600"><span className="font-medium text-gray-700">Attended by:</span> {visit.attendedBy || 'Staff'}</p>
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-gray-600"><span className="font-medium text-gray-700">Diagnosis:</span> {visit.diagnosis || 'N/A'}</p>
                                    <p className="text-gray-600"><span className="font-medium text-gray-700">Treatment:</span> {visit.treatment || 'N/A'}</p>
                                    {visit.prescription && <p className="text-gray-600"><span className="font-medium text-gray-700">Prescription:</span> {visit.prescription}</p>}
                                  </div>
                                </div>
                                {visit.notes && (
                                  <div className="mt-3 pt-3 border-t">
                                    <p className="text-sm text-gray-600"><span className="font-medium text-gray-700">Notes:</span> {visit.notes}</p>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    );
                  })()}
                </div>
              </div>
            );
          }

          // ==================== RENDER: STAFF/ADMIN DASHBOARD ====================
          return (
            <div className="min-h-screen bg-gray-50">

              {/* ===== DOCTOR MANAGEMENT MODAL ===== */}
              {showDoctorMgmt && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={() => setShowDoctorMgmt(false)}>
                  <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{background:'linear-gradient(to right,#047857,#065f46)'}}>
                      <div>
                        <h2 className="text-white font-bold text-lg">👨‍⚕️ Doctor Management</h2>
                        <p className="text-white/80 text-xs mt-0.5">Manage clinic doctors and their schedules</p>
                      </div>
                      <button onClick={() => setShowDoctorMgmt(false)} className="text-white/80 hover:text-white text-2xl font-bold">&times;</button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                      {doctorMsg && (
                        <div className={`px-4 py-2 rounded-lg text-sm font-medium ${doctorMsg.startsWith('✓') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                          {doctorMsg}
                        </div>
                      )}

                      {/* Add / Edit Doctor Form */}
                      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                        <p className="text-sm font-bold text-green-800 mb-3">{editingDoctorId ? '✏️ Edit Doctor' : '➕ Add New Doctor'}</p>
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div className="col-span-2">
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Full Name <span className="text-red-500">*</span></label>
                            <input type="text" value={doctorForm.name} onChange={e => setDoctorForm(f=>({...f,name:e.target.value}))}
                              placeholder="e.g. Dr. Maria Santos"
                              className="w-full px-3 py-2 border border-green-300 rounded-lg text-sm focus:ring-2 focus:ring-green-400" />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Specialty</label>
                            <select value={doctorForm.specialty} onChange={e => setDoctorForm(f=>({...f,specialty:e.target.value}))}
                              className="w-full px-3 py-2 border border-green-300 rounded-lg text-sm">
                              {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
                            <select value={doctorForm.enabled ? 'active' : 'inactive'} onChange={e => setDoctorForm(f=>({...f,enabled:e.target.value==='active'}))}
                              className="w-full px-3 py-2 border border-green-300 rounded-lg text-sm">
                              <option value="active">● Active</option>
                              <option value="inactive">○ Inactive</option>
                            </select>
                          </div>
                        </div>

                        {/* Schedule Builder */}
                        <div className="mb-3">
                          <label className="block text-xs font-semibold text-gray-700 mb-2">Weekly Schedule</label>
                          <div className="space-y-2">
                            {DAYS_OF_WEEK.slice(0,5).map(day => {
                              const existing = doctorForm.schedules.find(s => s.day === day);
                              return (
                                <div key={day} className="flex items-center gap-2">
                                  <input type="checkbox" checked={!!existing}
                                    onChange={e => {
                                      if (e.target.checked) setDoctorForm(f=>({...f,schedules:[...f.schedules,{day,start:'08:00',end:'17:00'}]}));
                                      else setDoctorForm(f=>({...f,schedules:f.schedules.filter(s=>s.day!==day)}));
                                    }}
                                    className="w-4 h-4 rounded" />
                                  <span className="text-xs font-medium text-gray-700 w-20">{day}</span>
                                  {existing && (
                                    <>
                                      <input type="time" value={existing.start}
                                        onChange={e => setDoctorForm(f=>({...f,schedules:f.schedules.map(s=>s.day===day?{...s,start:e.target.value}:s)}))}
                                        className="px-2 py-1 border border-gray-300 rounded text-xs" />
                                      <span className="text-xs text-gray-400">to</span>
                                      <input type="time" value={existing.end}
                                        onChange={e => setDoctorForm(f=>({...f,schedules:f.schedules.map(s=>s.day===day?{...s,end:e.target.value}:s)}))}
                                        className="px-2 py-1 border border-gray-300 rounded text-xs" />
                                    </>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          {editingDoctorId && (
                            <button onClick={() => { setEditingDoctorId(null); setDoctorForm({id:'',name:'',specialty:'General Physician',schedules:[],enabled:true}); }}
                              className="px-4 py-2 bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg">Cancel</button>
                          )}
                          <button onClick={() => {
                            if (!doctorForm.name.trim()) { setDoctorMsg('Doctor name is required.'); return; }
                            if (editingDoctorId) {
                              saveDoctors(doctors.map(d => d.id === editingDoctorId ? {...doctorForm, id: editingDoctorId} : d));
                              setDoctorMsg('✓ Doctor updated successfully!');
                            } else {
                              const newDoc = {...doctorForm, id: 'doc-' + Date.now()};
                              saveDoctors([...doctors, newDoc]);
                              setDoctorMsg('✓ Doctor added successfully!');
                            }
                            setEditingDoctorId(null);
                            setDoctorForm({id:'',name:'',specialty:'General Physician',schedules:[],enabled:true});
                          }}
                            className="flex-1 px-4 py-2 text-white text-sm font-semibold rounded-lg" style={{background:'#047857'}}>
                            {editingDoctorId ? 'Update Doctor' : 'Add Doctor'}
                          </button>
                        </div>
                      </div>

                      {/* Doctor List */}
                      <div className="space-y-3">
                        <p className="text-sm font-bold text-gray-700">{doctors.length} Doctor{doctors.length !== 1 ? 's' : ''} Registered</p>
                        {doctors.length === 0 ? (
                          <p className="text-sm text-gray-400 text-center py-4 italic">No doctors added yet.</p>
                        ) : doctors.map(doc => (
                          <div key={doc.id} className={`border rounded-xl p-4 ${doc.enabled ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-200 opacity-60'}`}>
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="font-bold text-gray-800 text-sm">{doc.name}</p>
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${isDoctorAvailableToday(doc) ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                    {isDoctorAvailableToday(doc) ? '● Available Today' : '○ Not Today'}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-500">🏥 {doc.specialty}</p>
                                <p className="text-xs text-gray-400 mt-0.5">📅 {getDoctorScheduleDisplay(doc)}</p>
                              </div>
                              <div className="flex gap-1 flex-shrink-0">
                                <button onClick={() => { setEditingDoctorId(doc.id); setDoctorForm({...doc}); setDoctorMsg(''); }}
                                  className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-lg font-semibold">Edit</button>
                                <button onClick={() => { if(window.confirm(`Remove ${doc.name}?`)) { saveDoctors(doctors.filter(d=>d.id!==doc.id)); setDoctorMsg('✓ Doctor removed.'); }}}
                                  className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-lg font-semibold">Remove</button>
                              </div>
                            </div>
                          </div>
                        ))}
                        <button onClick={() => { if(window.confirm('Reset to default doctors?')) { saveDoctors(DEFAULT_DOCTORS); setDoctorMsg('✓ Reset to defaults.'); }}}
                          className="w-full py-2 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">
                          Reset to Default Doctors
                        </button>
                      </div>
                    </div>
                    <div className="px-6 py-4 border-t flex-shrink-0">
                      <button onClick={() => setShowDoctorMgmt(false)}
                        className="w-full py-2.5 border border-gray-300 rounded-xl text-gray-600 font-semibold hover:bg-gray-50">Close</button>
                    </div>
                  </div>
                </div>
              )}

                            {/* ===== SERVICE MANAGEMENT MODAL ===== */}
              {showServiceMgmt && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={() => setShowServiceMgmt(false)}>
                  <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{background:'linear-gradient(to right,var(--ht-primary),var(--ht-accent))'}}>
                      <div>
                        <h2 className="text-white font-bold text-lg">⚙️ Service Management</h2>
                        <p className="text-white/80 text-xs mt-0.5">Manage clinic services, categories, and booking capacity</p>
                      </div>
                      <button onClick={() => setShowServiceMgmt(false)} className="text-white/80 hover:text-white text-2xl font-bold">&times;</button>
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b bg-gray-50 flex-shrink-0 overflow-x-auto">
                      {[
                        { id:'categories', label:'📂 Categories' },
                        { id:'services',   label:'🩺 Services' },
                        { id:'capacity',   label:'📊 Capacity' },
                      ].map(t => (
                        <button key={t.id} onClick={() => { setServiceMgmtTab(t.id); setServiceMgmtMsg(''); setEditingCategory(null); setEditingService(null); }}
                          className={`px-5 py-3 text-sm font-semibold whitespace-nowrap transition-colors ${serviceMgmtTab === t.id ? 'border-b-2 text-red-700 bg-white' : 'text-gray-500 hover:text-gray-700'}`}
                          style={serviceMgmtTab === t.id ? {borderColor:'var(--ht-primary)'} : {}}>
                          {t.label}
                        </button>
                      ))}
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6">
                      {serviceMgmtMsg && (
                        <div className={`mb-4 px-4 py-2 rounded-lg text-sm font-medium ${serviceMgmtMsg.startsWith('✓') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                          {serviceMgmtMsg}
                        </div>
                      )}

                      {/* ── CATEGORIES TAB ── */}
                      {serviceMgmtTab === 'categories' && (
                        <div className="space-y-4">
                          {/* Add new category */}
                          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                            <p className="text-sm font-bold text-blue-800 mb-3">➕ Add New Category</p>
                            <div className="grid grid-cols-1 gap-3">
                              <input type="text" value={newCategoryForm.name} onChange={e => setNewCategoryForm(f=>({...f,name:e.target.value}))}
                                placeholder="Category name (e.g. Mental Health Services)"
                                className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent" />
                              <div className="flex gap-3">
                                <select value={newCategoryForm.urgency} onChange={e => setNewCategoryForm(f=>({...f,urgency:e.target.value}))}
                                  className="flex-1 px-3 py-2 border border-blue-300 rounded-lg text-sm">
                                  <option value="Non-Urgent">Non-Urgent</option>
                                  <option value="Urgent">Urgent</option>
                                  <option value="Mixed">Mixed</option>
                                </select>
                                <button onClick={addCategory}
                                  className="px-5 py-2 text-white text-sm font-semibold rounded-lg" style={{background:'var(--ht-primary)'}}>
                                  Add Category
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* List existing categories */}
                          <div className="space-y-2">
                            {Object.entries(serviceCategories).map(([name, cat]) => (
                              <div key={name} className={`border rounded-xl p-4 transition-all ${cat.enabled === false ? 'bg-gray-50 border-gray-200 opacity-60' : 'bg-white border-gray-200'}`}>
                                {editingCategory?.name === name ? (
                                  <div className="space-y-2">
                                    <input type="text" defaultValue={name}
                                      id={`cat-edit-${name}`}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                                    <div className="flex gap-2">
                                      <select defaultValue={cat.urgency} id={`cat-urgency-${name}`}
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm">
                                        <option value="Non-Urgent">Non-Urgent</option>
                                        <option value="Urgent">Urgent</option>
                                        <option value="Mixed">Mixed</option>
                                      </select>
                                      <button onClick={() => updateCategory(name, document.getElementById(`cat-edit-${name}`).value, document.getElementById(`cat-urgency-${name}`).value)}
                                        className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg">Save</button>
                                      <button onClick={() => setEditingCategory(null)}
                                        className="px-4 py-2 bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg">Cancel</button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <p className="font-semibold text-gray-800 text-sm">{name}</p>
                                      <p className="text-xs text-gray-500">{cat.urgency} · {cat.services?.length || 0} services</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <button onClick={() => toggleCategory(name)}
                                        className={`text-xs px-3 py-1.5 rounded-full font-semibold ${cat.enabled === false ? 'bg-gray-200 text-gray-500' : 'bg-green-100 text-green-700'}`}>
                                        {cat.enabled === false ? '○ Disabled' : '● Enabled'}
                                      </button>
                                      <button onClick={() => setEditingCategory({name})}
                                        className="text-xs px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full font-semibold hover:bg-blue-200">Edit</button>
                                      <button onClick={() => deleteCategory(name)}
                                        className="text-xs px-3 py-1.5 bg-red-100 text-red-700 rounded-full font-semibold hover:bg-red-200">Delete</button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* ── SERVICES TAB ── */}
                      {serviceMgmtTab === 'services' && (
                        <div className="space-y-4">
                          {/* Add new service */}
                          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                            <p className="text-sm font-bold text-purple-800 mb-3">➕ Add New Service Type</p>
                            <div className="space-y-2">
                              <select value={newServiceForm.category} onChange={e => setNewServiceForm(f=>({...f,category:e.target.value}))}
                                className="w-full px-3 py-2 border border-purple-300 rounded-lg text-sm">
                                <option value="">Select Category</option>
                                {Object.keys(serviceCategories).map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                              <input type="text" value={newServiceForm.name} onChange={e => setNewServiceForm(f=>({...f,name:e.target.value}))}
                                placeholder="Service name"
                                className="w-full px-3 py-2 border border-purple-300 rounded-lg text-sm" />
                              <div className="flex gap-2">
                                <select value={newServiceForm.priority} onChange={e => setNewServiceForm(f=>({...f,priority:e.target.value}))}
                                  className="flex-1 px-3 py-2 border border-purple-300 rounded-lg text-sm">
                                  <option value="Regular">Regular</option>
                                  <option value="Urgent">Urgent</option>
                                  <option value="Priority Case">Priority Case</option>
                                </select>
                                <button onClick={addService}
                                  className="px-5 py-2 text-white text-sm font-semibold rounded-lg" style={{background:'var(--ht-primary)'}}>
                                  Add Service
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* List services by category */}
                          {Object.entries(serviceCategories).map(([catName, cat]) => (
                            <div key={catName} className="border border-gray-200 rounded-xl overflow-hidden">
                              <div className="bg-gray-50 px-4 py-2.5 flex items-center justify-between">
                                <p className="text-sm font-bold text-gray-700">📂 {catName}</p>
                                <span className="text-xs text-gray-400">{cat.services?.length || 0} services</span>
                              </div>
                              {(cat.services || []).length === 0 ? (
                                <p className="text-xs text-gray-400 px-4 py-3 italic">No services yet</p>
                              ) : (
                                <div className="divide-y divide-gray-100">
                                  {(cat.services || []).map((svc, idx) => (
                                    <div key={idx} className={`px-4 py-3 ${svc.enabled === false ? 'opacity-50 bg-gray-50' : ''}`}>
                                      {editingService?.category === catName && editingService?.index === idx ? (
                                        <div className="space-y-2">
                                          <input type="text" defaultValue={svc.name} id={`svc-edit-${catName}-${idx}`}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                                          <div className="flex gap-2">
                                            <select defaultValue={svc.priority} id={`svc-pri-${catName}-${idx}`}
                                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm">
                                              <option value="Regular">Regular</option>
                                              <option value="Urgent">Urgent</option>
                                              <option value="Priority Case">Priority Case</option>
                                            </select>
                                            <button onClick={() => updateService(catName, idx, document.getElementById(`svc-edit-${catName}-${idx}`).value, document.getElementById(`svc-pri-${catName}-${idx}`).value)}
                                              className="px-3 py-2 bg-green-600 text-white text-xs font-semibold rounded-lg">Save</button>
                                            <button onClick={() => setEditingService(null)}
                                              className="px-3 py-2 bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg">Cancel</button>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="flex items-center justify-between gap-2">
                                          <div className="flex-1 min-w-0">
                                            <p className="text-sm text-gray-800 truncate">{svc.name}</p>
                                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${svc.priority === 'Priority Case' ? 'bg-red-100 text-red-700' : svc.priority === 'Urgent' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'}`}>
                                              {svc.priority}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-1 flex-shrink-0">
                                            <button onClick={() => toggleService(catName, idx)}
                                              className={`text-xs px-2 py-1 rounded-full font-semibold ${svc.enabled === false ? 'bg-gray-200 text-gray-500' : 'bg-green-100 text-green-700'}`}>
                                              {svc.enabled === false ? '○' : '●'}
                                            </button>
                                            <button onClick={() => setEditingService({category:catName,index:idx})}
                                              className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-semibold">Edit</button>
                                            <button onClick={() => deleteService(catName, idx)}
                                              className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full font-semibold">Del</button>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* ── CAPACITY TAB ── */}
                      {serviceMgmtTab === 'capacity' && (
                        <div className="space-y-4">
                          <div className="bg-white border border-gray-200 rounded-xl p-5">
                            <p className="font-bold text-gray-800 mb-1">📊 Maximum Booking Capacity Per Slot</p>
                            <p className="text-sm text-gray-500 mb-4">Current: <span className="font-bold text-red-700">{slotCapacity} patients per time slot</span> × 8 slots = <span className="font-bold text-red-700">{slotCapacity * 8} max/day</span></p>
                            <div className="flex gap-3 items-center">
                              <input type="number" defaultValue={slotCapacity} min="1" max="200" id="capacity-input"
                                className="w-32 px-4 py-2.5 border border-gray-300 rounded-xl text-center text-lg font-bold focus:ring-2 focus:ring-red-400" />
                              <button onClick={() => { saveSlotCapacity(document.getElementById('capacity-input').value); setServiceMgmtMsg('✓ Booking capacity updated!'); }}
                                className="px-5 py-2.5 text-white font-semibold rounded-xl" style={{background:'var(--ht-primary)'}}>
                                Save Capacity
                              </button>
                            </div>
                            <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3">
                              <p className="text-xs text-amber-700"><strong>Recommended:</strong> 38/slot (304/day) covers 100–300 patients. Adjust based on clinic staffing.</p>
                            </div>
                          </div>
                          <div className="bg-white border border-gray-200 rounded-xl p-5">
                            <p className="font-bold text-gray-800 mb-3">🔄 Reset Services to Default</p>
                            <p className="text-sm text-gray-500 mb-3">Restore all service categories and types to the original system defaults.</p>
                            <button onClick={() => { if(window.confirm('Reset all services to default? Custom services will be lost.')) { saveServiceCategories(DEFAULT_SERVICE_CATEGORIES); setServiceMgmtMsg('✓ Services reset to default.'); } }}
                              className="px-5 py-2.5 bg-gray-700 text-white font-semibold rounded-xl text-sm hover:bg-gray-800">
                              Reset to Default
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 border-t flex-shrink-0">
                      <button onClick={() => setShowServiceMgmt(false)}
                        className="w-full py-2.5 border border-gray-300 rounded-xl text-gray-600 font-semibold hover:bg-gray-50">
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              )}

                            {/* ===== SETTINGS MODAL ===== */}
              {showSettingsModal && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={() => setShowSettingsModal(false)}>
                  <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b" style={{background:'linear-gradient(to right,var(--ht-primary),var(--ht-accent))'}}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0" style={{background: avatarColor}}>
                          {(currentUser?.fullName || currentUser?.username || '?')[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-white font-bold text-sm">{currentUser?.fullName || currentUser?.username}</p>
                          <p className="text-white/80 text-xs capitalize">{currentUser?.role || userRole}</p>
                        </div>
                      </div>
                      <button onClick={() => setShowSettingsModal(false)} className="text-white/80 hover:text-white text-2xl font-bold leading-none">&times;</button>
                    </div>

                    {/* Tab Menu */}
                    <div className="flex border-b bg-gray-50 rounded-none overflow-x-auto">
                      {[
                        { id:'profile',  label:'Profile',  icon:'👤' },
                        { id:'avatar',   label:'Avatar',   icon:'🎨' },
                        { id:'contact',  label:'Contact',  icon:'📱' },
                        { id:'email',    label:'Email',    icon:'✉️' },
                        { id:'password', label:'Password', icon:'🔒' },
                      ].map(tab => (
                        <button key={tab.id} onClick={() => { setSettingsTab(tab.id); setSettingsError(''); setSettingsSuccess(''); }}
                          className={`flex-1 py-3 text-xs font-semibold transition-colors whitespace-nowrap px-2 ${settingsTab === tab.id ? 'border-b-2 text-red-700 bg-white' : 'text-gray-500 hover:text-gray-700'}`}
                          style={settingsTab === tab.id ? {borderColor:'var(--ht-primary)'} : {}}>
                          {tab.icon} {tab.label}
                        </button>
                      ))}
                    </div>

                    {/* Content */}
                    <div className="px-6 py-5">
                      {settingsError && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2 text-sm mb-4">{settingsError}</div>}
                      {settingsSuccess && <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-2 text-sm mb-4">✓ {settingsSuccess}</div>}

                      {settingsTab === 'profile' && (
                        <div className="space-y-3">
                          <p className="text-xs text-gray-500 mb-3">Update your display name shown across the system.</p>
                          <div><label className="block text-sm font-semibold text-gray-700 mb-1">First Name</label>
                            <input type="text" value={settingsForm.firstName} onChange={e => setSettingsForm(f=>({...f,firstName:e.target.value}))}
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-400 focus:border-transparent" /></div>
                          <div><label className="block text-sm font-semibold text-gray-700 mb-1">Middle Initial <span className="text-gray-400 font-normal">(optional)</span></label>
                            <input type="text" value={settingsForm.middleInitial} onChange={e => setSettingsForm(f=>({...f,middleInitial:e.target.value.slice(0,1).toUpperCase()}))}
                              maxLength={1} placeholder="A"
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-400 focus:border-transparent" /></div>
                          <div><label className="block text-sm font-semibold text-gray-700 mb-1">Last Name</label>
                            <input type="text" value={settingsForm.lastName} onChange={e => setSettingsForm(f=>({...f,lastName:e.target.value}))}
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-400 focus:border-transparent" /></div>
                        </div>
                      )}

                      {settingsTab === 'avatar' && (
                        <div>
                          <p className="text-xs text-gray-500 mb-4">Choose a color for your avatar initials.</p>
                          <div className="flex justify-center mb-5">
                            <div className="w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-3xl shadow-lg transition-all" style={{background: avatarColor}}>
                              {(currentUser?.fullName || currentUser?.username || '?')[0].toUpperCase()}
                            </div>
                          </div>
                          <div className="flex flex-wrap justify-center gap-3">
                            {AVATAR_COLORS.map(c => (
                              <button key={c} onClick={() => setAvatarColor(c)}
                                className={`w-10 h-10 rounded-full transition-all transform hover:scale-110 ${avatarColor === c ? 'ring-4 ring-offset-2 scale-110' : ''}`}
                                style={{background: c, ringColor: c}} />
                            ))}
                          </div>
                        </div>
                      )}

                      {settingsTab === 'contact' && (
                        <div>
                          <p className="text-xs text-gray-500 mb-3">Update your contact number on file.</p>
                          <div><label className="block text-sm font-semibold text-gray-700 mb-1">Contact Number</label>
                            <input type="text" value={settingsForm.contactNumber} onChange={e => setSettingsForm(f=>({...f,contactNumber:e.target.value}))}
                              placeholder="09XXXXXXXXX"
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-400 focus:border-transparent" /></div>
                        </div>
                      )}

                      {settingsTab === 'email' && (
                        <div>
                          <p className="text-xs text-gray-500 mb-3">Update your registered email address.</p>
                          <div><label className="block text-sm font-semibold text-gray-700 mb-1">Email Address</label>
                            <input type="email" value={settingsForm.email} onChange={e => setSettingsForm(f=>({...f,email:e.target.value}))}
                              placeholder="email@example.com"
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-400 focus:border-transparent" /></div>
                        </div>
                      )}

                      {settingsTab === 'password' && (
                        <div className="space-y-3">
                          <p className="text-xs text-gray-500 mb-3">Choose a strong password with at least 8 characters.</p>
                          <div><label className="block text-sm font-semibold text-gray-700 mb-1">Current Password</label>
                            <input type="password" value={settingsForm.currentPassword} onChange={e => setSettingsForm(f=>({...f,currentPassword:e.target.value}))}
                              placeholder="Enter current password"
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-400 focus:border-transparent" /></div>
                          <div><label className="block text-sm font-semibold text-gray-700 mb-1">New Password</label>
                            <input type="password" value={settingsForm.newPassword} onChange={e => setSettingsForm(f=>({...f,newPassword:e.target.value}))}
                              placeholder="Min 8 characters"
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-400 focus:border-transparent" /></div>
                          <div><label className="block text-sm font-semibold text-gray-700 mb-1">Confirm New Password</label>
                            <input type="password" value={settingsForm.confirmNewPassword} onChange={e => setSettingsForm(f=>({...f,confirmNewPassword:e.target.value}))}
                              placeholder="Re-enter new password"
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-400 focus:border-transparent" /></div>
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="flex gap-3 px-6 pb-5">
                      <button onClick={() => setShowSettingsModal(false)}
                        className="flex-1 py-2.5 border border-gray-300 rounded-xl text-gray-600 font-semibold hover:bg-gray-50">
                        Cancel
                      </button>
                      <button onClick={saveSettings} disabled={settingsLoading}
                        className="flex-1 py-2.5 rounded-xl text-white font-semibold disabled:opacity-60"
                        style={{background:'linear-gradient(to right,var(--ht-primary),var(--ht-accent))'}}>
                        {settingsLoading ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

                            {/* ===== FORGOT PASSWORD MODAL ===== */}
              {showForgotPassword && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-bold text-gray-800">Forgot Password</h2>
                      <button onClick={() => setShowForgotPassword(false)} className="text-gray-400 hover:text-gray-600 text-2xl font-bold leading-none">&times;</button>
                    </div>
                    {forgotStatus ? (
                      <div className="text-center py-6">
                        <div className="text-5xl mb-4">📧</div>
                        <p className="text-green-700 font-semibold text-base mb-2">✅ Temporary Password Sent!</p>
                        <p className="text-gray-600 text-sm mb-6">{forgotStatus}</p>
                        <button
                          onClick={() => { setShowForgotPassword(false); setForgotStatus(''); }}
                          className="px-6 py-2 rounded-xl text-white font-semibold" style={{background:'linear-gradient(to right,var(--ht-primary),var(--ht-accent))'}}
                        >Back to Login</button>
                      </div>
                    ) : (
                      <form onSubmit={handleForgotPassword}>
                        <p className="text-sm text-gray-500 mb-4">Enter your registered <strong>email address</strong> or <strong>mobile number</strong> and we'll send you a temporary password.</p>
                        {forgotError && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-4">{forgotError}</div>}
                        <div className="mb-4">
                          <label className="block text-sm font-semibold text-gray-700 mb-1">Email or Mobile Number</label>
                          <input
                            type="text"
                            value={forgotEmail}
                            onChange={(e) => { setForgotEmail(e.target.value); setForgotError(''); }}
                            placeholder="e.g. juan@email.com or 09XXXXXXXXX"
                            autoFocus
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-400 focus:border-transparent"
                          />
                          <p className="text-xs text-gray-400 mt-1">Temp password will be sent to your registered email</p>
                        </div>
                        <div className="flex gap-3">
                          <button type="button" onClick={() => { setShowForgotPassword(false); setForgotEmail(''); setForgotError(''); setForgotStatus(''); }}
                            className="flex-1 py-2.5 border border-gray-300 rounded-xl text-gray-600 font-semibold hover:bg-gray-50">Cancel</button>
                          <button type="submit" disabled={forgotLoading}
                            className="flex-1 py-2.5 rounded-xl text-white font-semibold disabled:opacity-60"
                            style={{background:'linear-gradient(to right,var(--ht-primary),var(--ht-accent))'}}>
                            {forgotLoading ? 'Sending...' : 'Send Temporary Password'}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>
              )}

              {/* Header */}
              <div className="text-white shadow-lg" style={{background:'linear-gradient(to right,var(--ht-primary),var(--ht-primary-dark))'}}>
                <div className="container mx-auto px-4 py-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <img src="Upper_Bicutan_Logo.jpg" alt="Barangay Upper Bicutan" className="w-12 h-12 object-contain rounded-full" style={{background:'rgba(255,255,255,0.15)',padding:'2px'}} />
                      <div>
                        <h1 className="text-2xl font-bold">HealthTrack</h1>
                        <p className="text-sm" style={{color:'rgba(255,255,255,0.85)'}}>Patient Information System with Queueing for Barangay Upper Bicutan Health Clinics - City of Taguig</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">

                      {/* ── Patient Quick Search ── */}
                      <div className="relative hidden md:block" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center bg-white/15 hover:bg-white/25 rounded-xl px-3 py-2 transition-colors">
                          <svg className="w-4 h-4 text-white/70 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          <input
                            type="text"
                            value={headerSearch}
                            onChange={e => handleHeaderSearch(e.target.value)}
                            onFocus={() => headerSearch && setHeaderSearchOpen(true)}
                            placeholder="Search patient..."
                            className="bg-transparent text-white placeholder-white/60 text-sm outline-none w-48 focus:w-64 transition-all"
                          />
                          {headerSearch && (
                            <button onClick={() => { setHeaderSearch(''); setHeaderSearchResults([]); setHeaderSearchOpen(false); }}
                              className="text-white/60 hover:text-white ml-1 text-lg leading-none">×</button>
                          )}
                        </div>

                        {/* Search Results Dropdown */}
                        {headerSearchOpen && headerSearchResults.length > 0 && (
                          <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
                            <div className="px-4 py-2 bg-gray-50 border-b">
                              <p className="text-xs font-semibold text-gray-500">{headerSearchResults.length} patient{headerSearchResults.length !== 1 ? 's' : ''} found</p>
                            </div>
                            <div className="max-h-72 overflow-y-auto">
                              {headerSearchResults.map(p => {
                                const patientVisits = visitLog.filter(v => v.patientId === p.patientId);
                                return (
                                  <button key={p.patientId}
                                    onClick={() => { setSelectedPatient(p); setHeaderSearch(''); setHeaderSearchResults([]); setHeaderSearchOpen(false); setActiveTab('patients'); }}
                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 transition-colors text-left border-b border-gray-50 last:border-0">
                                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-base flex-shrink-0"
                                      style={{background:'var(--ht-primary)'}}>
                                      {p.firstName?.[0]?.toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-bold text-gray-800 truncate">{p.firstName} {p.middleName ? p.middleName + ' ' : ''}{p.lastName}</p>
                                      <p className="text-xs text-gray-500">{p.patientId} · {p.age || 'N/A'}y · {p.sex || 'N/A'}</p>
                                      <p className="text-xs text-gray-400">{p.contactNumber || 'No contact'} · {patientVisits.length} visit{patientVisits.length !== 1 ? 's' : ''}</p>
                                    </div>
                                    <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                  </button>
                                );
                              })}
                            </div>
                            <div className="px-4 py-2 bg-gray-50 border-t">
                              <p className="text-xs text-gray-400">Click a patient to view their full profile</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Notification Bell for Admin/Staff */}
                      <div className="relative">
                        <button
                          onClick={() => { setShowNotifPanel(!showNotifPanel); markNotifsRead(); }}
                          className="relative p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                        >
                          <Bell className="w-6 h-6" />
                          {notifications.filter(n => !n.read).length > 0 && (
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                              {notifications.filter(n => !n.read).length > 9 ? '9+' : notifications.filter(n => !n.read).length}
                            </span>
                          )}
                        </button>
                        {showNotifPanel && (
                          <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
                            <div className="px-4 py-3 bg-gray-50 border-b flex justify-between items-center">
                              <p className="text-sm font-bold text-gray-800">🔔 Notifications</p>
                              <button onClick={() => setShowNotifPanel(false)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
                            </div>
                            <div className="max-h-80 overflow-y-auto">
                              {notifications.length === 0 ? (
                                <div className="text-center py-8 text-gray-400">
                                  <p className="text-sm">No notifications yet</p>
                                </div>
                              ) : notifications.slice(0, 10).map((n, i) => (
                                <div key={n.id || i} className={`px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${!n.read ? 'bg-blue-50' : ''}`}>
                                  <p className="text-sm font-semibold text-gray-800">{n.title}</p>
                                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{n.message}</p>
                                  <p className="text-xs text-gray-400 mt-1">{new Date(n.timestamp).toLocaleString('en-PH')}</p>
                                </div>
                              ))}
                            </div>
                            {notifications.length > 0 && (
                              <div className="px-4 py-2 bg-gray-50 border-t">
                                <button onClick={() => setNotifications([])} className="text-xs text-red-500 hover:text-red-700">Clear all</button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="relative">
                        <button onClick={(e) => { e.stopPropagation(); setShowSettingsMenu(v => !v); }}
                          className="flex items-center gap-2 hover:bg-white/10 rounded-xl px-3 py-2 transition-colors cursor-pointer">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-base flex-shrink-0"
                            style={{background: avatarColor}}>
                            {(currentUser?.fullName || currentUser?.username || '?')[0].toUpperCase()}
                          </div>
                          <div className="text-right hidden sm:block">
                            <p className="text-sm font-semibold text-white leading-tight">{currentUser ? currentUser.fullName : (userRole === 'admin' ? 'Administrator' : 'Staff')}</p>
                            <p className="text-xs text-blue-200">{userRole === 'admin' ? 'Administrator' : 'Staff'} Access</p>
                          </div>
                          <svg className="w-4 h-4 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </button>
                        {showSettingsMenu && (
                          <div onClick={(e) => e.stopPropagation()} className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
                            <div className="px-4 py-3 bg-gray-50 border-b">
                              <p className="text-sm font-bold text-gray-800">{currentUser?.fullName || currentUser?.username}</p>
                              <p className="text-xs text-gray-500 capitalize">{currentUser?.role || userRole}</p>
                            </div>
                            {[
                              { label:'Edit Profile Information', icon:'👤', tab:'profile' },
                              { label:'Change Avatar Color',      icon:'🎨', tab:'avatar' },
                              { label:'Update Contact Number',    icon:'📱', tab:'contact' },
                              { label:'Update Email Address',     icon:'✉️', tab:'email' },
                              { label:'Change Password',          icon:'🔒', tab:'password' },
                            ].map(item => (
                              <button key={item.tab} onClick={() => openSettings(item.tab)}
                                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-red-50 hover:text-red-700 transition-colors text-left">
                                <span>{item.icon}</span>{item.label}
                              </button>
                            ))}
                            {userRole === 'admin' && (
                              <div className="border-t">
                                <button onClick={() => { setShowSettingsMenu(false); setServiceMgmtTab('categories'); setServiceMgmtMsg(''); setShowServiceMgmt(true); }}
                                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-blue-700 hover:bg-blue-50 transition-colors text-left font-semibold">
                                  <span>⚙️</span> Service Management
                                </button>
                                <button onClick={() => { setShowSettingsMenu(false); setDoctorMsg(''); setDoctorForm({id:'',name:'',specialty:'General Physician',schedules:[],enabled:true}); setEditingDoctorId(null); setShowDoctorMgmt(true); }}
                                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-green-700 hover:bg-green-50 transition-colors text-left font-semibold">
                                  <span>👨‍⚕️</span> Doctor Management
                                </button>
                              </div>
                            )}
                            <div className="border-t">
                              <button onClick={() => { setShowSettingsMenu(false); handleLogout(); }}
                                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors text-left">
                                <span>🚪</span> Logout
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <div className="bg-white shadow-sm border-b">
                <nav className="nav-scroll">
                  <div className="flex space-x-1 px-4">
                    {[
                      { id: 'dashboard', label: 'Dashboard', icon: BarChart },
                      { id: 'queue', label: 'Queue Management', icon: Clock },
                      { id: 'patients', label: 'Patients', icon: Users },
                      { id: 'visitlog', label: 'Visit Log', icon: List },
                      { id: 'analytics', label: 'Analytics', icon: BarChart },
                      { id: 'reports', label: 'Reports', icon: FileSpreadsheet },
                      ...(userRole === 'admin' ? [
                        { id: 'accounts', label: 'Accounts', icon: Users },
                        { id: 'auditlog', label: 'Audit Log', icon: List },
                        { id: 'theme', label: '🎨 Theme', icon: Activity }
                      ] : [])
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center space-x-2 px-6 py-4 border-b-2 transition-colors ${
                          activeTab === tab.id
                            ? 'border-transparent font-semibold'
                            : 'border-transparent text-gray-600 hover:border-gray-300'
                        }`}
                        style={activeTab === tab.id ? {borderColor:'var(--ht-primary)',color:'var(--ht-primary)',borderBottomColor:'var(--ht-primary)'} : {}}
                      >
                        <tab.icon className="w-5 h-5" />
                        <span>{tab.label}</span>
                      </button>
                    ))}
                  </div>
                </nav>
              </div>

              {/* Main Content */}
              <div className="container mx-auto px-4 py-6">
                {/* DASHBOARD TAB */}
                {activeTab === 'dashboard' && (
                  <div className="space-y-6">
                    {/* Stats Cards */}
                    <div className="grid md:grid-cols-4 gap-6">
                      <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-gray-600 text-sm font-medium uppercase">Total Patients</p>
                            <p className="text-3xl font-bold text-gray-800 mt-2">{registeredPatients.length}</p>
                          </div>
                          <Users className="w-12 h-12 text-blue-500 opacity-50" />
                        </div>
                      </div>

                      <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-orange-500">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-gray-600 text-sm font-medium uppercase">In Queue</p>
                            <p className="text-3xl font-bold text-gray-800 mt-2">{queue.length}</p>
                          </div>
                          <Clock className="w-12 h-12 text-orange-500 opacity-50" />
                        </div>
                      </div>

                      <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-red-500">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-gray-600 text-sm font-medium uppercase">Priority & Urgent</p>
                            <p className="text-3xl font-bold text-gray-800 mt-2">
                              {queue.filter(p => p.priority === 'Priority Case' || p.priority === 'Urgent').length}
                            </p>
                            <p className="text-sm text-gray-600">Priority & urgent cases only</p>
                          </div>
                          <AlertCircle className="w-12 h-12 text-red-500 opacity-50" />
                        </div>
                      </div>

                      <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-gray-600 text-sm font-medium uppercase">Today's Visits</p>
                            <p className="text-3xl font-bold text-gray-800 mt-2">
                              {visitLog.filter(v => new Date(v.visitDate).toDateString() === new Date().toDateString()).length}
                            </p>
                          </div>
                          <CheckCircle className="w-12 h-12 text-green-500 opacity-50" />
                        </div>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="bg-white rounded-xl shadow-md p-6">
                      <h2 className="text-xl font-bold text-gray-800 mb-4">Quick Actions</h2>
                      <div className="grid md:grid-cols-3 gap-4">
                        <button
                          onClick={() => setShowRegisterPatient(true)}
                          className="flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-4 rounded-lg font-semibold hover:from-blue-600 hover:to-blue-700 transition-all transform hover:scale-105 shadow-md"
                        >
                          <UserPlus className="w-5 h-5" />
                          <span>Register New Patient</span>
                        </button>
                        <button
                          onClick={() => setShowRegisterPatient(true)}
                          className="flex items-center justify-center space-x-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white py-4 rounded-lg font-semibold hover:from-orange-600 hover:to-orange-700 transition-all transform hover:scale-105 shadow-md"
                        >
                          <Clock className="w-5 h-5" />
                          <span>Walk-in Queue</span>
                        </button>
                        <button
                          onClick={() => setActiveTab('analytics')}
                          className="flex items-center justify-center space-x-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white py-4 rounded-lg font-semibold hover:from-purple-600 hover:to-purple-700 transition-all transform hover:scale-105 shadow-md"
                        >
                          <BarChart className="w-5 h-5" />
                          <span>View Analytics</span>
                        </button>
                      </div>
                    </div>

                    {/* Recent Activity */}
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="bg-white rounded-xl shadow-md p-6">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">Current Queue Summary</h3>
                        <div className="space-y-3">
                          {queue.length === 0 ? (
                            <p className="text-gray-500 text-center py-4">No patients in queue</p>
                          ) : (
                            queue.slice(0, 5).map((item, index) => (
                              <div key={item.id} className={`border rounded-lg p-3 ${priorityLevels[item.priority].bgLight} ${priorityLevels[item.priority].border}`}>
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="flex items-center space-x-2">
                                      <span className="font-bold text-gray-700">#{index + 1}</span>
                                      <span className="font-semibold text-gray-800">{item.name}</span>
                                    </div>
                                    <p className="text-xs text-gray-600 mt-1">{item.service}</p>
                                  </div>
                                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${priorityLevels[item.priority].color} text-white`}>
                                    {item.priority}
                                  </span>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      <div className="bg-white rounded-xl shadow-md p-6">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">Recent Visits (Today)</h3>
                        <div className="space-y-3">
                          {visitLog.filter(v => new Date(v.visitDate).toDateString() === new Date().toDateString()).slice(0, 5).length === 0 ? (
                            <p className="text-gray-500 text-center py-4">No visits today</p>
                          ) : (
                            visitLog
                              .filter(v => new Date(v.visitDate).toDateString() === new Date().toDateString())
                              .slice(0, 5)
                              .map((visit) => (
                                <div key={visit.id} className="border rounded-lg p-3 hover:shadow-md transition-shadow">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <p className="font-semibold text-gray-800">{visit.name}</p>
                                      <p className="text-xs text-gray-600">{visit.service}</p>
                                    </div>
                                    <p className="text-xs text-gray-500">{new Date(visit.timeServed).toLocaleTimeString()}</p>
                                  </div>
                                </div>
                              ))
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* QUEUE MANAGEMENT TAB */}
                {activeTab === 'queue' && (
                  <div className="space-y-6">
                    <div className="flex flex-wrap justify-between items-center gap-3">
                      <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-bold text-gray-800">Queue Management</h2>
                        <button
                          onClick={() => { loadQueue(); loadPatients(); }}
                          className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full transition-colors font-medium"
                          title="Refresh queue"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                          Refresh
                        </button>
                        <span className="text-xs text-gray-400">Auto-refreshes every 3s</span>
                      </div>
                      <div className="flex items-center gap-3">
                        {/* Search */}
                        <div className="relative">
                          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={queueSearch}
                            onChange={e => setQueueSearch(e.target.value)}
                            placeholder="Search name, ID, service..."
                            className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent w-56"
                          />
                          {queueSearch && (
                            <button onClick={() => setQueueSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">✕</button>
                          )}
                        </div>
                        <button
                          onClick={() => setShowRegisterPatient(true)}
                          className="flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-blue-700 transition-all transform hover:scale-105 shadow-md"
                        >
                          <UserPlus className="w-5 h-5" />
                          <span>Walk-in Queue</span>
                        </button>
                        <button
                          onClick={async () => {
                            const nextPatient = queue.find(q => q.status === 'Accepted');
                            if (!nextPatient) {
                              alert('No accepted patients in queue to advance.');
                              return;
                            }
                            if (window.confirm(`Manually call next patient?\n\n${nextPatient.name}\nQueue #${String(nextPatient.queueNumber || '?').padStart(3,'0')} · ${nextPatient.serviceCategory || nextPatient.service}`)) {
                              await callToTV(nextPatient);
                            }
                          }}
                          className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-lg font-semibold transition-all shadow-md"
                          title="Manually call next patient to TV display"
                        >
                          <span>⏭️</span>
                          <span>Next</span>
                        </button>

                    {/* Status Filter Tabs */}
                    <div className="flex flex-wrap gap-2">
                      {[
                        { key: 'all', label: 'All', count: queue.length },
                        { key: 'Waiting', label: 'Waiting', count: queue.filter(q => q.status === 'Waiting').length },
                        { key: 'Accepted', label: 'Accepted', count: queue.filter(q => q.status === 'Accepted').length },
                        { key: 'In Progress', label: 'In Progress', count: queue.filter(q => q.status === 'In Progress').length },
                        { key: 'Completed', label: 'Served', count: queue.filter(q => q.status === 'Completed').length },
                        { key: 'Rejected', label: 'Rejected', count: queue.filter(q => q.status === 'Rejected').length },
                      ].map(f => (
                        <button key={f.key}
                          onClick={() => setQueueStatusFilter(f.key)}
                          className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all border ${
                            queueStatusFilter === f.key
                              ? 'bg-red-600 text-white border-red-600 shadow-sm'
                              : 'bg-white text-gray-600 border-gray-300 hover:border-red-400 hover:text-red-600'
                          }`}
                        >
                          {f.label} {f.count > 0 && <span className={`ml-1 text-xs ${queueStatusFilter === f.key ? 'text-red-200' : 'text-gray-400'}`}>({f.count})</span>}
                        </button>
                      ))}
                    </div>

                    {/* Queue Stats */}
                    <div className="grid md:grid-cols-4 gap-4">
                      <div className="bg-gray-100 border border-gray-300 rounded-lg p-4">
                        <p className="text-sm text-gray-600 font-medium">Total in Queue</p>
                        <p className="text-3xl font-bold text-gray-800">{queue.length}</p>
                      </div>
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <p className="text-sm text-gray-600 font-medium">Priority Cases</p>
                        <p className="text-3xl font-bold text-red-600">
                          {queue.filter(p => p.priority === 'Priority Case').length}
                        </p>
                      </div>
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                        <p className="text-sm text-gray-600 font-medium">Urgent</p>
                        <p className="text-3xl font-bold text-orange-600">
                          {queue.filter(p => p.priority === 'Urgent').length}
                        </p>
                      </div>
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <p className="text-sm text-gray-600 font-medium">Regular</p>
                        <p className="text-3xl font-bold text-green-600">
                          {queue.filter(p => p.priority === 'Regular').length}
                        </p>
                      </div>
                    </div>

                    {/* Queue List */}
                    <div className="bg-white rounded-xl shadow-md p-6">
                      <h3 className="text-lg font-bold text-gray-800 mb-4">Current Queue</h3>
                      {queue.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                          <Clock className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                          <p className="text-lg">No patients in queue</p>
                          <p className="text-sm">Add patients to the queue to get started</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {(() => {
                            const filtered = queue.filter(item => {
                              const matchStatus = queueStatusFilter === 'all' || item.status === queueStatusFilter;
                              const q = queueSearch.toLowerCase();
                              const matchSearch = !q || 
                                item.name?.toLowerCase().includes(q) ||
                                item.patientId?.toLowerCase().includes(q) ||
                                item.service?.toLowerCase().includes(q) ||
                                item.serviceCategory?.toLowerCase().includes(q) ||
                                String(item.queueNumber).includes(q);
                              return matchStatus && matchSearch;
                            });
                            if (filtered.length === 0) return (
                              <div className="text-center py-10 text-gray-400">
                                <p className="text-sm">No queue entries match your search or filter.</p>
                                <button onClick={() => { setQueueSearch(''); setQueueStatusFilter('all'); }} className="mt-2 text-xs text-blue-500 hover:underline">Clear filters</button>
                              </div>
                            );
                            return filtered.map((item, index) => {
                            const apptSlot = item.appointmentTime ? CLINIC_SLOTS.find(s => s.value === item.appointmentTime) : null;
                            const apptDateFmt = item.appointmentDate
                              ? new Date(item.appointmentDate + 'T00:00:00').toLocaleDateString('en-PH', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })
                              : null;
                            const statusColors = {
                              'Accepted':  'bg-green-100 text-green-700 border-green-300',
                              'Rejected':  'bg-red-100 text-red-700 border-red-300',
                              'Waiting':   'bg-yellow-100 text-yellow-700 border-yellow-300',
                              'Completed': 'bg-blue-100 text-blue-700 border-blue-300',
                            };
                            const statusBadge = statusColors[item.status] || 'bg-gray-100 text-gray-600 border-gray-300';
                            return (
                              <div key={item.id} className={`border-2 rounded-xl p-4 ${priorityLevels[item.priority]?.bgLight || 'bg-gray-50'} ${priorityLevels[item.priority]?.border || 'border-gray-200'} ${item.status === 'Rejected' ? 'opacity-70' : ''}`}>
                                <div className="flex justify-between items-start gap-4">
                                  {/* LEFT: Patient info */}
                                  <div className="flex-1 min-w-0">
                                    {/* Top row: queue number + name + status badge */}
                                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                                      {/* Queue Number Badge */}
                                      {item.queueNumber ? (
                                        <div className="flex flex-col items-center justify-center min-w-[52px]">
                                          <span className="text-xs font-bold uppercase tracking-wide text-gray-400 leading-none">Queue</span>
                                          <span className="text-3xl font-black leading-tight" style={{color:'var(--ht-primary)'}}>
                                            {String(item.queueNumber).padStart(3,'0')}
                                          </span>
                                        </div>
                                      ) : (
                                        <div className="flex flex-col items-center justify-center min-w-[52px]">
                                          <span className="text-xs font-bold uppercase tracking-wide text-gray-400 leading-none">Pos</span>
                                          <span className="text-3xl font-bold text-gray-400">#{index + 1}</span>
                                        </div>
                                      )}
                                      <div>
                                        <p className="font-bold text-gray-800 text-lg leading-tight">{item.name}</p>
                                        <p className="text-xs text-gray-500">ID: {item.patientId} | Age: {item.age} | Sex: {item.sex}</p>
                                      </div>
                                      {item.status && (
                                        <span className={`ml-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusBadge}`}>
                                          {item.status === 'Accepted' ? '✓ Accepted' : item.status === 'Rejected' ? '✗ Rejected' : item.status}
                                        </span>
                                      )}
                                      {item.selfBooked && (
                                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 border border-purple-300">Self-Booked</span>
                                      )}
                                      {item.age >= 60 && (
                                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-300">👴 Senior</span>
                                      )}
                                      {(() => {
                                        const pat = registeredPatients.find(p => p.patientId === item.patientId);
                                        return pat?.pwdId ? (
                                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-300">♿ PWD</span>
                                        ) : null;
                                      })()}
                                    </div>

                                    {/* Details grid */}
                                    <div className="grid md:grid-cols-2 gap-x-6 gap-y-1 ml-12 text-sm text-gray-600">
                                      <p><span className="font-medium">Service:</span> {item.service}</p>
                                      <p><span className="font-medium">Priority:</span> {item.priority}</p>
                                      {item.assignedDoctor && (
                                        <p className="text-sm font-semibold text-green-700 mt-1">👨‍⚕️ {item.assignedDoctor}</p>
                                      )}
                                      <p><span className="font-medium">Category:</span> {item.serviceCategory}</p>
                                      <p><span className="font-medium">Queued at:</span> {new Date(item.timeQueued).toLocaleTimeString()}</p>
                                    </div>
                                    <div className="ml-12 mt-1 text-sm text-gray-600">
                                      <p><span className="font-medium">Reason for Visit:</span> {item.chiefComplaint}</p>
                                    </div>

                                    {/* ── Appointment Date & Time ── */}
                                    {apptDateFmt ? (
                                      <div className="ml-12 mt-3 flex items-center gap-2 bg-white bg-opacity-80 border border-blue-200 rounded-lg px-3 py-2 w-fit">
                                        <span className="text-lg">📅</span>
                                        <div>
                                          <p className="text-xs text-blue-500 font-semibold uppercase tracking-wide leading-none">Scheduled Appointment</p>
                                          <p className="text-sm font-bold text-gray-800 leading-tight">{apptDateFmt}</p>
                                          <p className="text-xs text-blue-700 font-semibold leading-tight">
                                            🕐 {apptSlot ? `${apptSlot.label} (Slot ${apptSlot.slot})` : item.appointmentTime}
                                          </p>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="ml-12 mt-3 flex items-center gap-2 bg-gray-50 border border-dashed border-gray-300 rounded-lg px-3 py-1.5 w-fit">
                                        <span className="text-sm">🚶</span>
                                        <p className="text-xs text-gray-400 italic">Walk-in — no scheduled appointment</p>
                                      </div>
                                    )}

                                    {/* Rejection reason display */}
                                    {item.status === 'Rejected' && item.rejectedReason && (
                                      <div className="ml-12 mt-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                                        <p className="text-xs font-semibold text-red-600 uppercase tracking-wide">Rejection Reason</p>
                                        <p className="text-sm text-red-700">{item.rejectedReason}</p>
                                      </div>
                                    )}
                                  </div>

                                  {/* RIGHT: Action buttons */}
                                  <div className="flex flex-col gap-2 min-w-[110px]">
                                    {item.status !== 'Rejected' && item.status !== 'Completed' && (
                                      <>
                                        {item.status !== 'Accepted' && (
                                          <div className="flex flex-col gap-1">
                                            <button
                                              onClick={() => acceptAppointment(item)}
                                              className="flex items-center justify-center gap-1.5 bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg text-xs font-bold transition-colors w-full"
                                            >
                                              <CheckCircle className="w-3.5 h-3.5" />
                                              Accept
                                            </button>
                                            <select
                                              defaultValue=""
                                              onChange={e => { if(e.target.value) { acceptAppointment({...item, assignedDoctor: e.target.value}); e.target.value=''; } }}
                                              className="text-xs px-2 py-1.5 border border-blue-200 rounded-lg bg-white text-gray-600 w-full cursor-pointer">
                                              <option value="">👨‍⚕️ Assign Doctor</option>
                                              {doctors.filter(d => d.enabled).map(d => (
                                                <option key={d.id} value={d.name}>{d.name}</option>
                                              ))}
                                            </select>
                                          </div>
                                        )}
                                        <button
                                          onClick={() => markAsServed(item)}
                                          className="flex items-center justify-center gap-1.5 bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-lg text-xs font-bold transition-colors w-full"
                                        >
                                          <CheckCircle className="w-3.5 h-3.5" />
                                          Served
                                        </button>
                                        <button
                                          onClick={() => callToTV(item)}
                                          className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-colors w-full ${item.status === 'In Progress' ? 'bg-purple-600 text-white' : 'bg-purple-100 hover:bg-purple-500 hover:text-white text-purple-700'}`}
                                        >
                                          <span>📺</span>
                                          {item.status === 'In Progress' ? 'On TV' : 'Call'}
                                        </button>
                                        <button
                                          onClick={() => openRejectModal(item)}
                                          className="flex items-center justify-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 rounded-lg text-xs font-bold transition-colors w-full"
                                        >
                                          <XCircle className="w-3.5 h-3.5" />
                                          Reject
                                        </button>
                                      </>
                                    )}
                                    <button
                                      onClick={() => removeFromQueue(item)}
                                      className="flex items-center justify-center gap-1.5 bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg text-xs font-bold transition-colors w-full"
                                    >
                                      <Trash className="w-3.5 h-3.5" />
                                      Remove
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          });
                          })()}
                        </div>
                      )}

                      {/* ── Reject Reason Modal ── */}
                      {rejectTarget && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                            <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-t-2xl px-6 py-4">
                              <h3 className="text-lg font-bold text-white">Reject Appointment</h3>
                              <p className="text-orange-100 text-sm mt-0.5">This will notify the patient of the rejection.</p>
                            </div>
                            <div className="p-6">
                              <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-3 mb-4">
                                <p className="font-bold text-gray-800">{rejectTarget.name}</p>
                                <p className="text-xs text-gray-500">ID: {rejectTarget.patientId}</p>
                                {rejectTarget.appointmentDate && (
                                  <p className="text-sm text-orange-700 mt-1 font-medium">
                                    📅 {new Date(rejectTarget.appointmentDate + 'T00:00:00').toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                    {rejectTarget.appointmentTime && ` — ${CLINIC_SLOTS.find(s=>s.value===rejectTarget.appointmentTime)?.label || rejectTarget.appointmentTime}`}
                                  </p>
                                )}
                              </div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Reason for Rejection <span className="text-red-500">*</span>
                              </label>
                              <textarea
                                value={rejectReason}
                                onChange={(e) => { setRejectReason(e.target.value); setRejectError(''); }}
                                rows={4}
                                placeholder="e.g. Slot conflict, clinic closed, patient record incomplete..."
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none text-sm"
                              />
                              {rejectError && <p className="text-xs text-red-500 mt-1">{rejectError}</p>}
                              <div className="flex gap-3 mt-4">
                                <button onClick={closeRejectModal}
                                  className="flex-1 py-2.5 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors text-sm">
                                  Cancel
                                </button>
                                <button onClick={confirmReject}
                                  className="flex-1 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-bold hover:from-orange-600 hover:to-red-600 transition-all text-sm">
                                  Confirm Rejection
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* PATIENTS TAB */}
                {activeTab === 'patients' && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <h2 className="text-2xl font-bold text-gray-800">Registered Patients</h2>
                      <div className="flex space-x-3">
                        <button
                          onClick={exportPatients}
                          className="flex items-center space-x-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
                        >
                          <Download className="w-4 h-4" />
                          <span>Export</span>
                        </button>
                        <button
                          onClick={() => setShowRegisterPatient(true)}
                          className="flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-blue-700 transition-all transform hover:scale-105 shadow-md"
                        >
                          <UserPlus className="w-5 h-5" />
                          <span>Register New Patient</span>
                        </button>
                      </div>
                    </div>

                    {/* Search Bar */}
                    <div className="bg-white rounded-xl shadow-md p-4">
                      <div className="relative">
                        <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search by Patient ID, Name, or Contact..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    {/* Patients List */}
                    <div className="bg-white rounded-xl shadow-md overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 border-b">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Patient ID</th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Name</th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Age/Sex</th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Contact</th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Address</th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {registeredPatients
                              .filter(patient => 
                                searchTerm === '' ||
                                patient.patientId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                `${patient.firstName} ${patient.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                patient.contact.includes(searchTerm)
                              )
                              .map((patient) => (
                                <tr key={patient.id} className="hover:bg-gray-50 transition-colors">
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="text-sm font-medium text-gray-900">{patient.patientId}</span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div>
                                      <p className="text-sm font-semibold text-gray-900">
                                        {patient.firstName} {patient.middleName} {patient.lastName}
                                      </p>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="text-sm text-gray-600">{patient.age} / {patient.sex}</span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="text-sm text-gray-600">{patient.contact}</span>
                                  </td>
                                  <td className="px-6 py-4">
                                    <span className="text-sm text-gray-600">{patient.address}</span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex space-x-2">
                                      <button
                                        onClick={() => setSelectedPatient(patient)}
                                        className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                                      >
                                        View
                                      </button>
                                      <button
                                        onClick={() => setEditingPatient(patient)}
                                        className="text-green-600 hover:text-green-800 font-medium text-sm"
                                      >
                                        Edit
                                      </button>
                                      <button
                                        onClick={() => deletePatient(patient.id)}
                                        className="text-red-600 hover:text-red-800 font-medium text-sm"
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                      {registeredPatients.filter(patient => 
                        searchTerm === '' ||
                        patient.patientId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        `${patient.firstName} ${patient.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        patient.contact.includes(searchTerm)
                      ).length === 0 && (
                        <div className="text-center py-12 text-gray-500">
                          <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                          <p className="text-lg">No patients found</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* VISIT LOG TAB */}
                {activeTab === 'visitlog' && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <h2 className="text-2xl font-bold text-gray-800">Visit Log</h2>
                      <button
                        onClick={exportVisitLog}
                        className="flex items-center space-x-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        <span>Export Visit Log</span>
                      </button>
                    </div>

                    {/* Visit Log List */}
                    <div className="bg-white rounded-xl shadow-md p-6">
                      <div className="space-y-4">
                        {visitLog.length === 0 ? (
                          <div className="text-center py-12 text-gray-500">
                            <List className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                            <p className="text-lg">No visits recorded</p>
                          </div>
                        ) : (
                          visitLog
                            .sort((a, b) => new Date(b.visitDate) - new Date(a.visitDate))
                            .map((visit) => (
                              <div key={visit.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-3">
                                  <div>
                                    <p className="font-semibold text-gray-800 text-lg">{visit.name}</p>
                                    <p className="text-sm text-gray-600">Patient ID: {visit.patientId} | Age: {visit.age} | Sex: {visit.sex}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm font-medium text-gray-800">{new Date(visit.visitDate).toLocaleDateString()}</p>
                                    <p className="text-xs text-gray-500">{new Date(visit.timeServed).toLocaleTimeString()}</p>
                                  </div>
                                </div>
                                <div className="grid md:grid-cols-2 gap-4 mb-3">
                                  <div>
                                    <p className="text-sm text-gray-600">
                                      <span className="font-medium">Service:</span> {visit.service}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                      <span className="font-medium">Category:</span> {visit.serviceCategory}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                      <span className="font-medium">Priority:</span> 
                                      <span className={`ml-2 px-2 py-1 rounded-full text-xs font-semibold ${priorityLevels[visit.priority].color} text-white`}>
                                        {visit.priority}
                                      </span>
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-gray-600">
                                      <span className="font-medium">Contact:</span> {visit.contact}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                      <span className="font-medium">Address:</span> {visit.address}
                                    </p>
                                  </div>
                                </div>
                                <div className="pt-3 border-t">
                                  <p className="text-sm text-gray-700 mb-2">
                                    <span className="font-medium">Reason for Visit:</span> {visit.chiefComplaint}
                                  </p>
                                  {visit.diagnosis && (
                                    <p className="text-sm text-gray-700 mb-2">
                                      <span className="font-medium">Diagnosis:</span> {visit.diagnosis}
                                    </p>
                                  )}
                                  {visit.treatment && (
                                    <p className="text-sm text-gray-700 mb-2">
                                      <span className="font-medium">Treatment:</span> {visit.treatment}
                                    </p>
                                  )}
                                  {visit.prescription && (
                                    <p className="text-sm text-gray-700 mb-2">
                                      <span className="font-medium">Prescription:</span> {visit.prescription}
                                    </p>
                                  )}
                                  {visit.notes && (
                                    <p className="text-sm text-gray-700">
                                      <span className="font-medium">Notes:</span> {visit.notes}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* ANALYTICS TAB */}
                {activeTab === 'analytics' && (
                  <div className="space-y-6">
                    {/* Header with Report Export Options */}
                    <div className="flex justify-between items-center">
                      <h2 className="text-2xl font-bold text-gray-800">Data Analytics Dashboard</h2>
                      <div className="flex gap-2">
                        <select
                          value={analyticsTimeRange}
                          onChange={(e) => setAnalyticsTimeRange(e.target.value)}
                          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="daily">Daily Report</option>
                          <option value="weekly">Weekly Report</option>
                          <option value="monthly">Monthly Report</option>
                          <option value="yearly">Yearly Report</option>
                        </select>
                        <button
                          onClick={exportAnalytics}
                          className="flex items-center space-x-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
                        >
                          <Download className="w-4 h-4" />
                          <span>Export Report</span>
                        </button>
                      </div>
                    </div>

                    {/* Top Metrics Cards */}
                    <div className="grid md:grid-cols-4 gap-6">
                      {(() => {
                        const data = getAnalyticsData();
                        const avgDailyVisits = data.length > 0 ? (data.length / 7).toFixed(1) : 0;
                        const totalAppointments = queue.filter(q => q.appointmentDate).length;
                        
                        return (
                          <>
                            <div className="bg-white rounded-xl shadow-md p-6">
                              <p className="text-gray-600 text-sm font-medium mb-2">Total Visits</p>
                              <p className="text-4xl font-bold text-blue-600">{data.length}</p>
                            </div>
                            <div className="bg-white rounded-xl shadow-md p-6">
                              <p className="text-gray-600 text-sm font-medium mb-2">Avg. Daily Visits</p>
                              <p className="text-4xl font-bold text-green-600">{avgDailyVisits}</p>
                            </div>
                            <div className="bg-white rounded-xl shadow-md p-6">
                              <p className="text-gray-600 text-sm font-medium mb-2">Total Appointments</p>
                              <p className="text-4xl font-bold text-purple-600">{totalAppointments}</p>
                            </div>
                            <div className="bg-white rounded-xl shadow-md p-6">
                              <p className="text-gray-600 text-sm font-medium mb-2">Registered Patients</p>
                              <p className="text-4xl font-bold text-gray-800">{registeredPatients.length}</p>
                            </div>
                          </>
                        );
                      })()}
                    </div>

                    {/* Charts Row 1 */}
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Priority Distribution */}
                      <div className="bg-white rounded-xl shadow-md p-6">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">Priority Distribution</h3>
                        {(() => {
                          const data = getAnalyticsData();
                          const priorityCounts = {
                            'Emergency': data.filter(v => v.priority === 'Priority Case').length,
                            'Urgent': data.filter(v => v.priority === 'Urgent').length,
                            'Regular': data.filter(v => v.priority === 'Regular').length
                          };
                          const maxCount = Math.max(...Object.values(priorityCounts), 1);
                          
                          return (
                            <div className="space-y-4">
                              <div className="flex items-end justify-around h-48 border-b border-gray-200">
                                {Object.entries(priorityCounts).map(([priority, count]) => (
                                  <div key={priority} className="flex flex-col items-center w-24">
                                    <div className="text-sm font-semibold text-gray-700 mb-2">{count}</div>
                                    <div 
                                      className={`w-16 rounded-t ${
                                        priority === 'Emergency' ? 'bg-red-500' :
                                        priority === 'Urgent' ? 'bg-orange-500' : 'bg-green-500'
                                      }`}
                                      style={{ height: `${(count / maxCount) * 160}px` }}
                                    ></div>
                                  </div>
                                ))}
                              </div>
                              <div className="flex justify-center gap-4 text-xs">
                                <div className="flex items-center gap-1">
                                  <div className="w-4 h-4 bg-red-500 rounded"></div>
                                  <span>Emergency</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <div className="w-4 h-4 bg-orange-500 rounded"></div>
                                  <span>Urgent</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <div className="w-4 h-4 bg-green-500 rounded"></div>
                                  <span>Regular</span>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Service Category Breakdown */}
                      <div className="bg-white rounded-xl shadow-md p-6">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">Service Category Breakdown</h3>
                        {(() => {
                          const data = getAnalyticsData();
                          const categoryCounts = {};
                          Object.keys(SERVICE_CATEGORIES).forEach(category => {
                            categoryCounts[category] = data.filter(v => v.serviceCategory === category).length;
                          });
                          const maxCount = Math.max(...Object.values(categoryCounts), 1);
                          const topCategories = Object.entries(categoryCounts)
                            .sort((a, b) => b[1] - a[1])
                            .slice(0, 5);
                          
                          return (
                            <div className="space-y-3">
                              {topCategories.map(([category, count]) => (
                                <div key={category}>
                                  <div className="flex justify-between text-sm mb-1">
                                    <span className="text-gray-700 truncate">{category}</span>
                                    <span className="font-semibold">{count}</span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-3">
                                    <div
                                      className="bg-blue-500 h-3 rounded-full"
                                      style={{ width: `${(count / maxCount) * 100}%` }}
                                    ></div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Charts Row 2 */}
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Daily Visits (Last 7 Days) */}
                      <div className="bg-white rounded-xl shadow-md p-6">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">Daily Visits (Last 7 Days)</h3>
                        {(() => {
                          const last7Days = [];
                          for (let i = 6; i >= 0; i--) {
                            const date = new Date();
                            date.setDate(date.getDate() - i);
                            const dateStr = date.toISOString().split('T')[0];
                            const count = visitLog.filter(v => v.visitDate === dateStr).length;
                            last7Days.push({
                              date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                              count: count
                            });
                          }
                          const maxCount = Math.max(...last7Days.map(d => d.count), 1);
                          
                          return (
                            <div className="space-y-2">
                              <div className="flex items-end justify-around h-40 border-b border-l border-gray-200">
                                {last7Days.map((day, index) => (
                                  <div key={index} className="flex flex-col items-center" style={{ width: `${100 / 7}%` }}>
                                    <div className="text-xs font-semibold text-gray-700 mb-1">{day.count}</div>
                                    {index > 0 && (
                                      <svg className="absolute" style={{ width: `${100 / 7}%`, height: '160px' }}>
                                        <line
                                          x1="0"
                                          y1={`${160 - (last7Days[index - 1].count / maxCount) * 140}px`}
                                          x2="100%"
                                          y2={`${160 - (day.count / maxCount) * 140}px`}
                                          stroke="#CC0000"
                                          strokeWidth="2"
                                        />
                                      </svg>
                                    )}
                                    <div 
                                      className="w-2 h-2 bg-blue-500 rounded-full relative z-10"
                                      style={{ marginTop: `${160 - (day.count / maxCount) * 140}px` }}
                                    ></div>
                                  </div>
                                ))}
                              </div>
                              <div className="flex justify-around text-xs text-gray-600">
                                {last7Days.map((day, index) => (
                                  <div key={index} className="text-center" style={{ width: `${100 / 7}%` }}>
                                    {day.date}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Age Distribution */}
                      <div className="bg-white rounded-xl shadow-md p-6">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">Age Distribution</h3>
                        {(() => {
                          const ageGroups = {
                            '0-17': 0,
                            '18-35': 0,
                            '36-50': 0,
                            '51-65': 0,
                            '65+': 0
                          };
                          
                          registeredPatients.forEach(patient => {
                            const age = patient.age;
                            if (age <= 17) ageGroups['0-17']++;
                            else if (age <= 35) ageGroups['18-35']++;
                            else if (age <= 50) ageGroups['36-50']++;
                            else if (age <= 65) ageGroups['51-65']++;
                            else ageGroups['65+']++;
                          });
                          
                          const maxCount = Math.max(...Object.values(ageGroups), 1);
                          
                          return (
                            <div className="flex items-end justify-around h-48 border-b border-gray-200">
                              {Object.entries(ageGroups).map(([group, count]) => (
                                <div key={group} className="flex flex-col items-center w-16">
                                  <div className="text-sm font-semibold text-gray-700 mb-2">{count}</div>
                                  <div 
                                    className="w-12 bg-purple-500 rounded-t"
                                    style={{ height: `${(count / maxCount) * 160}px` }}
                                  ></div>
                                  <div className="text-xs text-gray-600 mt-2">{group}</div>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Service Statistics */}
                    <div className="bg-white rounded-xl shadow-md p-6">
                      <h3 className="text-lg font-bold text-gray-800 mb-6">Service Statistics</h3>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {Object.keys(SERVICE_CATEGORIES).map(category => {
                          const count = getAnalyticsData().filter(v => v.serviceCategory === category).length;
                          return (
                            <div key={category} className="bg-gray-50 rounded-lg p-4 text-center">
                              <p className="text-3xl font-bold text-blue-600 mb-2">{count}</p>
                              <p className="text-xs text-gray-600">{category}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* ── HEALTH TRENDS & RECOMMENDATIONS ─────────────────────── */}
                    {(() => {
                      // Use visitLog data; fall back to queue data if no visits recorded yet
                      let data = getAnalyticsData();
                      const usingQueueFallback = data.length === 0 && queue.length > 0;
                      if (usingQueueFallback) {
                        // Map queue entries to analytics-compatible format
                        data = queue
                          .filter(q => !['Cancelled','Rejected'].includes(q.status))
                          .map(q => ({
                            serviceCategory: q.serviceCategory || q.service || 'Unknown',
                            service: q.serviceCategory || q.service || 'Unknown',
                            priority: q.priority || 'Regular',
                            age: q.age || 0,
                            patientId: q.patientId,
                            visitDate: q.timeQueued || q.appointmentDate || new Date().toISOString(),
                          }));
                      }
                      if (data.length === 0) return (
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
                          <p className="text-gray-400 text-sm">📊 No data available yet. Data will appear once patients are served or queued.</p>
                        </div>
                      );

                      // ── 1. Most Common Cases (by service category) ───────────
                      const caseCounts = {};
                      data.forEach(v => {
                        const key = v.serviceCategory || v.service || 'Unknown';
                        caseCounts[key] = (caseCounts[key] || 0) + 1;
                      });
                      const topCases = Object.entries(caseCounts)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 5);
                      const topCase = topCases[0];

                      // ── 2. Severity (by priority) ────────────────────────────
                      const severe   = data.filter(v => v.priority === 'Priority Case').length;
                      const moderate = data.filter(v => v.priority === 'Urgent').length;
                      const mild     = data.filter(v => v.priority === 'Regular').length;
                      const total    = data.length;
                      const severePct = Math.round((severe / total) * 100);
                      const moderatePct = Math.round((moderate / total) * 100);

                      // ── 3. Age group distribution ────────────────────────────
                      const ageGroups = { 'Child (0–17)': 0, 'Adult (18–59)': 0, 'Senior (60+)': 0 };
                      data.forEach(v => {
                        const age = v.age || registeredPatients.find(p => p.patientId === v.patientId)?.age;
                        if (!age) return;
                        if (age < 18) ageGroups['Child (0–17)']++;
                        else if (age < 60) ageGroups['Adult (18–59)']++;
                        else ageGroups['Senior (60+)']++;
                      });
                      const topAgeGroup = Object.entries(ageGroups).sort((a,b) => b[1]-a[1])[0];

                      // ── 4. Busiest day ───────────────────────────────────────
                      const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
                      const dayCounts = {};
                      data.forEach(v => {
                        const d = days[new Date(v.visitDate).getDay()];
                        dayCounts[d] = (dayCounts[d] || 0) + 1;
                      });
                      const busiestDay = Object.entries(dayCounts).sort((a,b) => b[1]-a[1])[0];

                      // ── 5. Month-over-month change ───────────────────────────
                      const now = new Date();
                      const thisMonth = visitLog.filter(v => {
                        const d = new Date(v.visitDate);
                        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                      }).length;
                      const lastMonth = visitLog.filter(v => {
                        const d = new Date(v.visitDate);
                        const lm = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
                        const ly = now.getMonth() === 0 ? now.getFullYear()-1 : now.getFullYear();
                        return d.getMonth() === lm && d.getFullYear() === ly;
                      }).length;
                      const momChange = lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : null;

                      // ── 6. Generate recommendations ──────────────────────────
                      const recommendations = [];

                      // Severity-based
                      if (severePct >= 40) {
                        recommendations.push({
                          icon: '🚨', color: 'red',
                          title: 'High Severity Alert',
                          text: `${severePct}% of cases are classified as Priority/Severe. Increase medical staff availability, prepare emergency medicines and supplies, and coordinate referrals to nearby hospitals.`
                        });
                      } else if (severePct >= 20) {
                        recommendations.push({
                          icon: '⚠️', color: 'orange',
                          title: 'Moderate Severity Cases Rising',
                          text: `${severePct}% severe cases recorded. Review staffing capacity and ensure emergency response readiness.`
                        });
                      }

                      // Top case-based
                      if (topCase) {
                        const cat = topCase[0].toLowerCase();
                        if (cat.includes('maternal') || cat.includes('prenatal')) {
                          recommendations.push({
                            icon: '🤱', color: 'pink',
                            title: 'Maternal Care Cases High',
                            text: `${topCase[0]} is the most frequent case (${topCase[1]} visits). Schedule additional prenatal clinic days and increase maternal health education sessions.`
                          });
                        } else if (cat.includes('child') || cat.includes('immuniz') || cat.includes('vaccination')) {
                          recommendations.push({
                            icon: '👶', color: 'blue',
                            title: 'Child Health Cases Increasing',
                            text: `${topCase[0]} is the leading case this period. Prepare vaccination schedules, nutrition programs, and growth monitoring activities.`
                          });
                        } else if (cat.includes('tb') || cat.includes('tuberculosis') || cat.includes('communicable')) {
                          recommendations.push({
                            icon: '🫁', color: 'red',
                            title: 'Communicable Disease Alert',
                            text: `${topCase[0]} is the most reported case. Intensify contact tracing, coordinate with DOTS centers, and conduct community awareness campaigns.`
                          });
                        } else if (cat.includes('basic') || cat.includes('medical') || cat.includes('hypertension') || cat.includes('respiratory')) {
                          recommendations.push({
                            icon: '💊', color: 'purple',
                            title: 'High Volume of Basic Medical Cases',
                            text: `${topCase[0]} accounts for the most visits (${topCase[1]}). Consider conducting a community health screening campaign and increasing medicine inventory.`
                          });
                        } else if (cat.includes('senior')) {
                          recommendations.push({
                            icon: '👴', color: 'blue',
                            title: 'Senior Citizen Cases Dominant',
                            text: `${topCase[0]} leads this period. Ensure adequate supply of maintenance medicines and consider scheduling dedicated senior citizen clinic days.`
                          });
                        } else {
                          recommendations.push({
                            icon: '📋', color: 'gray',
                            title: `${topCase[0]} Most Frequent`,
                            text: `${topCase[0]} has the highest case count (${topCase[1]} visits). Review resource allocation and consider targeted health education for this service area.`
                          });
                        }
                      }

                      // Age group
                      if (topAgeGroup && topAgeGroup[1] > 0) {
                        if (topAgeGroup[0].includes('Senior')) {
                          recommendations.push({
                            icon: '🏥', color: 'teal',
                            title: 'Senior-Dominated Patient Population',
                            text: `${topAgeGroup[1]} senior citizens (60+) visited this period. Prioritize maintenance medicine stock, regular BP monitoring, and coordination with PhilHealth for senior benefits.`
                          });
                        }
                      }

                      // Month over month
                      if (momChange !== null && momChange >= 25) {
                        recommendations.push({
                          icon: '📈', color: 'orange',
                          title: 'Patient Volume Surge',
                          text: `Visit volume increased by ${momChange}% compared to last month. Consider increasing clinic hours or adding additional health workers.`
                        });
                      }

                      if (busiestDay) {
                        recommendations.push({
                          icon: '📅', color: 'indigo',
                          title: `${busiestDay[0]} is the Busiest Day`,
                          text: `${busiestDay[1]} visits recorded on ${busiestDay[0]}s. Ensure full staffing and adequate supplies on this day to handle peak patient volume.`
                        });
                      }

                      const colorMap = {
                        red: 'bg-red-50 border-red-200 text-red-800',
                        orange: 'bg-orange-50 border-orange-200 text-orange-800',
                        pink: 'bg-pink-50 border-pink-200 text-pink-800',
                        blue: 'bg-blue-50 border-blue-200 text-blue-800',
                        purple: 'bg-purple-50 border-purple-200 text-purple-800',
                        teal: 'bg-teal-50 border-teal-200 text-teal-800',
                        indigo: 'bg-indigo-50 border-indigo-200 text-indigo-800',
                        gray: 'bg-gray-50 border-gray-200 text-gray-800',
                      };

                      return (
                        <div className="space-y-6">
                          {/* Section Header */}
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-lg">📊</div>
                            <div>
                              <h3 className="text-xl font-bold text-gray-800">Health Trends & Recommendations</h3>
                              <p className="text-sm text-gray-500">
                                {usingQueueFallback
                                  ? `Based on ${data.length} queued patient${data.length !== 1 ? 's' : ''} · Queue data (no completed visits yet)`
                                  : `Data-driven insights based on ${data.length} recorded visit${data.length !== 1 ? 's' : ''} · ${analyticsTimeRange} view`
                                }
                              </p>
                            </div>
                          </div>

                          <div className="grid md:grid-cols-2 gap-6">
                            {/* Most Common Cases */}
                            <div className="bg-white rounded-xl shadow-md p-6">
                              <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <span className="text-lg">🏷️</span> Most Common Cases
                              </h4>
                              <div className="space-y-3">
                                {topCases.map(([cat, count], i) => {
                                  const pct = Math.round((count / total) * 100);
                                  const colors = ['bg-red-500','bg-orange-500','bg-yellow-500','bg-blue-500','bg-green-500'];
                                  return (
                                    <div key={cat}>
                                      <div className="flex justify-between text-sm mb-1">
                                        <span className="font-medium text-gray-700 truncate max-w-[70%]">{cat}</span>
                                        <span className="font-bold text-gray-800">{count} <span className="text-gray-400 font-normal">({pct}%)</span></span>
                                      </div>
                                      <div className="w-full bg-gray-100 rounded-full h-2">
                                        <div className={`h-2 rounded-full ${colors[i]}`} style={{width:`${pct}%`}}></div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                              {topCase && (
                                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-700">
                                  💡 <strong>{topCase[0]}</strong> is the most frequently reported case this period. Review resource allocation for this service area.
                                </div>
                              )}
                            </div>

                            {/* Severity Analysis */}
                            <div className="bg-white rounded-xl shadow-md p-6">
                              <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <span className="text-lg">⚡</span> Severity Analysis
                              </h4>
                              <div className="space-y-3">
                                {[
                                  { label: 'Severe (Priority Case)', count: severe, pct: severePct, color: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50' },
                                  { label: 'Moderate (Urgent)', count: moderate, pct: moderatePct, color: 'bg-orange-500', text: 'text-orange-700', bg: 'bg-orange-50' },
                                  { label: 'Mild (Regular)', count: mild, pct: Math.round((mild/total)*100), color: 'bg-green-500', text: 'text-green-700', bg: 'bg-green-50' },
                                ].map(s => (
                                  <div key={s.label}>
                                    <div className="flex justify-between text-sm mb-1">
                                      <span className="font-medium text-gray-700">{s.label}</span>
                                      <span className="font-bold text-gray-800">{s.count} <span className="text-gray-400 font-normal">({s.pct}%)</span></span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-2">
                                      <div className={`h-2 rounded-full ${s.color}`} style={{width:`${s.pct}%`}}></div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              {severePct >= 40 ? (
                                <div className="mt-4 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
                                  🚨 <strong>{severePct}% of cases are severe.</strong> Immediate review of staffing capacity and emergency readiness is recommended.
                                </div>
                              ) : severePct >= 20 ? (
                                <div className="mt-4 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 text-xs text-orange-700">
                                  ⚠️ <strong>{severePct}% severe cases</strong> recorded. Monitor closely and ensure emergency preparedness.
                                </div>
                              ) : (
                                <div className="mt-4 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs text-green-700">
                                  ✅ Severity levels are within normal range. Continue standard health monitoring protocols.
                                </div>
                              )}
                            </div>

                            {/* Age & Volume Insights */}
                            <div className="bg-white rounded-xl shadow-md p-6">
                              <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <span className="text-lg">👥</span> Patient Demographics
                              </h4>
                              <div className="space-y-3">
                                {Object.entries(ageGroups).map(([group, count]) => {
                                  const pct = total > 0 ? Math.round((count/total)*100) : 0;
                                  return (
                                    <div key={group}>
                                      <div className="flex justify-between text-sm mb-1">
                                        <span className="font-medium text-gray-700">{group}</span>
                                        <span className="font-bold text-gray-800">{count} <span className="text-gray-400 font-normal">({pct}%)</span></span>
                                      </div>
                                      <div className="w-full bg-gray-100 rounded-full h-2">
                                        <div className="h-2 rounded-full bg-blue-400" style={{width:`${pct}%`}}></div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                              <div className="mt-4 grid grid-cols-2 gap-3">
                                <div className="bg-gray-50 rounded-lg p-3 text-center">
                                  <p className="text-xs text-gray-500">Busiest Day</p>
                                  <p className="text-lg font-bold text-gray-800">{busiestDay ? busiestDay[0].slice(0,3) : '—'}</p>
                                  <p className="text-xs text-gray-500">{busiestDay ? `${busiestDay[1]} visits` : ''}</p>
                                </div>
                                <div className={`rounded-lg p-3 text-center ${momChange === null ? 'bg-gray-50' : momChange > 0 ? 'bg-orange-50' : 'bg-green-50'}`}>
                                  <p className="text-xs text-gray-500">vs Last Month</p>
                                  <p className={`text-lg font-bold ${momChange === null ? 'text-gray-400' : momChange > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                                    {momChange === null ? 'N/A' : `${momChange > 0 ? '+' : ''}${momChange}%`}
                                  </p>
                                  <p className="text-xs text-gray-500">{momChange === null ? 'No prior data' : momChange > 0 ? 'Increase' : 'Decrease'}</p>
                                </div>
                              </div>
                            </div>

                            {/* System Recommendations */}
                            <div className="bg-white rounded-xl shadow-md p-6">
                              <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <span className="text-lg">💡</span> System Recommendations
                                <span className="ml-auto text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">{recommendations.length} action{recommendations.length !== 1 ? 's' : ''}</span>
                              </h4>
                              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                                {recommendations.length === 0 ? (
                                  <div className="text-center py-6 text-gray-400">
                                    <p className="text-sm">No critical recommendations at this time.</p>
                                    <p className="text-xs mt-1">Health indicators are within normal ranges.</p>
                                  </div>
                                ) : recommendations.map((rec, i) => (
                                  <div key={i} className={`border rounded-lg px-4 py-3 ${colorMap[rec.color]}`}>
                                    <p className="font-bold text-sm mb-1">{rec.icon} {rec.title}</p>
                                    <p className="text-xs leading-relaxed">{rec.text}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* AI-like insight strip */}
                          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-5 text-white">
                            <div className="flex items-start gap-3">
                              <div className="text-2xl mt-0.5">🤖</div>
                              <div>
                                <p className="font-bold text-sm mb-2 opacity-90 uppercase tracking-wide">Automated Health Intelligence Summary</p>
                                <div className="flex flex-wrap gap-2">
                                  {[
                                    topCase ? `📌 Most common: ${topCase[0]} (${topCase[1]} cases)` : null,
                                    severePct > 0 ? `⚡ ${severePct}% of visits are severe priority` : null,
                                    topAgeGroup && topAgeGroup[1] > 0 ? `👥 ${topAgeGroup[0]} is the dominant age group` : null,
                                    busiestDay ? `📅 Peak day: ${busiestDay[0]} (${busiestDay[1]} visits)` : null,
                                    momChange !== null ? `📈 ${momChange > 0 ? `+${momChange}%` : `${momChange}%`} patient volume vs last month` : null,
                                  ].filter(Boolean).map((insight, i) => (
                                    <span key={i} className="bg-white bg-opacity-20 rounded-full px-3 py-1 text-xs font-medium">
                                      {insight}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* ══ 1. QUEUE PERFORMANCE KPIs ══════════════════════════ */}
                    {(() => {
                      const today = getLocalDateStr();
                      const todayQueue = queue.filter(q => {
                        const d = q.appointmentDate || (q.timeQueued ? q.timeQueued.slice(0,10) : '');
                        return d === today || (q.timeQueued && q.timeQueued.slice(0,10) === today);
                      });
                      const totalToday = queue.length;
                      const servedToday = queue.filter(q => q.status === 'Completed').length;
                      const acceptedToday = queue.filter(q => q.status === 'Accepted' || q.status === 'In Progress' || q.status === 'Completed').length;
                      const rejectedToday = queue.filter(q => q.status === 'Rejected').length;
                      const waitingToday = queue.filter(q => q.status === 'Waiting').length;
                      const acceptanceRate = totalToday > 0 ? Math.round((acceptedToday / totalToday) * 100) : 0;
                      const servedRate = acceptedToday > 0 ? Math.round((servedToday / acceptedToday) * 100) : 0;

                      // Peak hour from visit log
                      const hourCounts = {};
                      visitLog.forEach(v => {
                        if (v.timeIn) {
                          const h = new Date(v.timeIn).getHours();
                          hourCounts[h] = (hourCounts[h] || 0) + 1;
                        }
                      });
                      const peakHour = Object.entries(hourCounts).sort((a,b) => b[1]-a[1])[0];
                      const peakHourLabel = peakHour ? (() => {
                        const h = parseInt(peakHour[0]);
                        return `${h % 12 || 12}:00 ${h >= 12 ? 'PM' : 'AM'}`;
                      })() : 'N/A';

                      return (
                        <div className="bg-white rounded-xl shadow-md p-6">
                          <div className="flex items-center gap-3 mb-5">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center text-white text-lg">⚡</div>
                            <div>
                              <h3 className="text-xl font-bold text-gray-800">Queue Performance</h3>
                              <p className="text-sm text-gray-500">Today's clinic operations overview</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                            {[
                              { label: 'Total Queued', value: totalToday, icon: '📋', color: 'blue' },
                              { label: 'Served Today', value: servedToday, icon: '✅', color: 'green' },
                              { label: 'Waiting', value: waitingToday, icon: '⏳', color: 'orange' },
                              { label: 'Rejected', value: rejectedToday, icon: '❌', color: 'red' },
                            ].map(k => (
                              <div key={k.label} className={`bg-${k.color}-50 border border-${k.color}-100 rounded-xl p-4 text-center`}>
                                <p className="text-2xl mb-1">{k.icon}</p>
                                <p className={`text-3xl font-black text-${k.color}-600`}>{k.value}</p>
                                <p className="text-xs text-gray-500 mt-1 font-medium">{k.label}</p>
                              </div>
                            ))}
                          </div>
                          <div className="grid md:grid-cols-3 gap-4">
                            <div className="bg-gray-50 rounded-xl p-4">
                              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Acceptance Rate</p>
                              <p className="text-2xl font-black text-gray-800">{acceptanceRate}%</p>
                              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                                <div className="h-2 rounded-full bg-green-500" style={{width:`${acceptanceRate}%`}}></div>
                              </div>
                              <p className="text-xs text-gray-400 mt-1">{acceptedToday} of {totalToday} bookings accepted</p>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-4">
                              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Completion Rate</p>
                              <p className="text-2xl font-black text-gray-800">{servedRate}%</p>
                              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                                <div className="h-2 rounded-full bg-blue-500" style={{width:`${servedRate}%`}}></div>
                              </div>
                              <p className="text-xs text-gray-400 mt-1">{servedToday} of {acceptedToday} accepted patients served</p>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-4">
                              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Peak Hour</p>
                              <p className="text-2xl font-black text-gray-800">{peakHourLabel}</p>
                              <p className="text-xs text-gray-400 mt-2">{peakHour ? `${peakHour[1]} visits at this hour` : 'No visit data yet'}</p>
                              {totalToday === 0 && <p className="text-xs text-amber-500 mt-1">⚠️ No queue entries today</p>}
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* ══ 2. VISIT TRENDS LINE CHART ═════════════════════════ */}
                    {(() => {
                      // Build last 30 days visit data
                      const days = [];
                      for (let i = 29; i >= 0; i--) {
                        const d = new Date();
                        d.setDate(d.getDate() - i);
                        const key = getLocalDateStr(d);
                        const count = visitLog.filter(v => v.visitDate && v.visitDate.slice(0,10) === key).length;
                        days.push({ date: key, count, label: `${d.getMonth()+1}/${d.getDate()}` });
                      }
                      const maxCount = Math.max(...days.map(d => d.count), 1);
                      const totalVisits30 = days.reduce((s, d) => s + d.count, 0);
                      const avgPerDay = (totalVisits30 / 30).toFixed(1);
                      const peakDay = days.reduce((a, b) => a.count >= b.count ? a : b);

                      const W = 700, H = 180, PAD = 40;
                      const points = days.map((d, i) => {
                        const x = PAD + (i / (days.length - 1)) * (W - PAD * 2);
                        const y = H - PAD - (d.count / maxCount) * (H - PAD * 2);
                        return `${x},${y}`;
                      }).join(' ');

                      return (
                        <div className="bg-white rounded-xl shadow-md p-6">
                          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-lg">📈</div>
                              <div>
                                <h3 className="text-xl font-bold text-gray-800">Visit Trends (Last 30 Days)</h3>
                                <p className="text-sm text-gray-500">Daily patient visit volume</p>
                              </div>
                            </div>
                            <div className="flex gap-4 text-center">
                              <div>
                                <p className="text-2xl font-black text-blue-600">{totalVisits30}</p>
                                <p className="text-xs text-gray-400">Total Visits</p>
                              </div>
                              <div>
                                <p className="text-2xl font-black text-indigo-600">{avgPerDay}</p>
                                <p className="text-xs text-gray-400">Avg/Day</p>
                              </div>
                              <div>
                                <p className="text-2xl font-black text-purple-600">{peakDay.count}</p>
                                <p className="text-xs text-gray-400">Peak Day</p>
                              </div>
                            </div>
                          </div>
                          {totalVisits30 === 0 ? (
                            <div className="text-center py-8 text-gray-400">
                              <p className="text-sm">📊 No visit data yet. Mark patients as Served to populate this chart.</p>
                            </div>
                          ) : (
                            <div className="overflow-x-auto">
                              <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{minWidth:'300px'}}>
                                {/* Grid lines */}
                                {[0,1,2,3,4].map(i => (
                                  <line key={i} x1={PAD} x2={W-PAD} y1={PAD + i*(H-PAD*2)/4} y2={PAD + i*(H-PAD*2)/4}
                                    stroke="#f3f4f6" strokeWidth="1"/>
                                ))}
                                {/* Area fill */}
                                <defs>
                                  <linearGradient id="visitGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3"/>
                                    <stop offset="100%" stopColor="#3B82F6" stopOpacity="0"/>
                                  </linearGradient>
                                </defs>
                                <polygon
                                  points={`${PAD},${H-PAD} ${points} ${W-PAD},${H-PAD}`}
                                  fill="url(#visitGrad)"
                                />
                                {/* Line */}
                                <polyline points={points} fill="none" stroke="#3B82F6" strokeWidth="2.5" strokeLinejoin="round"/>
                                {/* Dots for non-zero */}
                                {days.map((d, i) => {
                                  if (d.count === 0) return null;
                                  const x = PAD + (i / (days.length - 1)) * (W - PAD * 2);
                                  const y = H - PAD - (d.count / maxCount) * (H - PAD * 2);
                                  return <circle key={i} cx={x} cy={y} r="4" fill="#3B82F6" stroke="white" strokeWidth="2"/>;
                                })}
                                {/* X-axis labels — show every 5th */}
                                {days.map((d, i) => {
                                  if (i % 5 !== 0 && i !== days.length - 1) return null;
                                  const x = PAD + (i / (days.length - 1)) * (W - PAD * 2);
                                  return <text key={i} x={x} y={H-5} textAnchor="middle" fontSize="9" fill="#9ca3af">{d.label}</text>;
                                })}
                                {/* Y-axis labels */}
                                {[0,1,2].map(i => {
                                  const val = Math.round(maxCount * (1 - i/2));
                                  const y = PAD + i*(H-PAD*2)/2;
                                  return <text key={i} x={PAD-5} y={y+4} textAnchor="end" fontSize="9" fill="#9ca3af">{val}</text>;
                                })}
                              </svg>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* ══ 3. TOP DIAGNOSES TABLE ══════════════════════════════ */}
                    {(() => {
                      // Parse diagnoses from visit log
                      const diagCounts = {};
                      visitLog.forEach(v => {
                        const diag = (v.diagnosis || '').trim();
                        if (!diag || diag.toLowerCase() === 'n/a' || diag === '') return;
                        diagCounts[diag] = (diagCounts[diag] || 0) + 1;
                      });
                      const topDiags = Object.entries(diagCounts).sort((a,b) => b[1]-a[1]).slice(0, 10);
                      const totalDiags = Object.values(diagCounts).reduce((s,v) => s + v, 0);

                      return (
                        <div className="bg-white rounded-xl shadow-md p-6">
                          <div className="flex items-center gap-3 mb-5">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center text-white text-lg">📋</div>
                            <div>
                              <h3 className="text-xl font-bold text-gray-800">Top Diagnoses</h3>
                              <p className="text-sm text-gray-500">Most recorded diagnoses from visit log</p>
                            </div>
                            <span className="ml-auto text-xs bg-red-50 text-red-600 border border-red-200 px-3 py-1 rounded-full font-semibold">
                              {topDiags.length} unique diagnoses
                            </span>
                          </div>
                          {topDiags.length === 0 ? (
                            <div className="text-center py-8 text-gray-400">
                              <p className="text-sm">📋 No diagnoses recorded yet. Mark patients as Served and enter diagnoses to populate this table.</p>
                            </div>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b border-gray-100">
                                    <th className="text-left py-2 px-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Rank</th>
                                    <th className="text-left py-2 px-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Diagnosis</th>
                                    <th className="text-center py-2 px-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Cases</th>
                                    <th className="text-left py-2 px-3 text-xs font-bold text-gray-500 uppercase tracking-wide w-40">Frequency</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {topDiags.map(([diag, count], i) => {
                                    const pct = totalDiags > 0 ? Math.round((count/totalDiags)*100) : 0;
                                    const colors = ['bg-red-500','bg-orange-500','bg-yellow-500','bg-blue-500','bg-green-500',
                                                    'bg-purple-500','bg-pink-500','bg-teal-500','bg-indigo-500','bg-gray-500'];
                                    return (
                                      <tr key={diag} className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${i < 3 ? 'font-semibold' : ''}`}>
                                        <td className="py-3 px-3">
                                          <span className={`w-6 h-6 rounded-full text-white text-xs flex items-center justify-center font-bold ${colors[i]}`}>
                                            {i + 1}
                                          </span>
                                        </td>
                                        <td className="py-3 px-3 text-gray-800 max-w-xs">
                                          <span className="truncate block">{diag}</span>
                                        </td>
                                        <td className="py-3 px-3 text-center">
                                          <span className="font-bold text-gray-800">{count}</span>
                                          <span className="text-gray-400 text-xs ml-1">({pct}%)</span>
                                        </td>
                                        <td className="py-3 px-3">
                                          <div className="w-full bg-gray-100 rounded-full h-2">
                                            <div className={`h-2 rounded-full ${colors[i]}`} style={{width:`${pct}%`}}></div>
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                  </div>
                )}

                {/* REPORTS TAB */}
                {activeTab === 'reports' && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-gray-800">Generate Reports</h2>

                    {/* Report Types Grid */}
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Daily Report */}
                      <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="bg-blue-100 p-3 rounded-lg">
                              <Calendar className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                              <h3 className="text-lg font-bold text-gray-800">Daily Report</h3>
                              <p className="text-sm text-gray-600">Today's clinic activities and statistics</p>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-xs text-gray-600 mb-1">Report Date</p>
                            <p className="font-semibold text-gray-800">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="bg-blue-50 rounded p-2 text-center">
                              <p className="text-xl font-bold text-blue-600">
                                {visitLog.filter(v => new Date(v.visitDate).toDateString() === new Date().toDateString()).length}
                              </p>
                              <p className="text-xs text-gray-600">Today's Visits</p>
                            </div>
                            <div className="bg-blue-50 rounded p-2 text-center">
                              <p className="text-xl font-bold text-blue-600">
                                {queue.length}
                              </p>
                              <p className="text-xs text-gray-600">In Queue</p>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setAnalyticsTimeRange('daily');
                              exportAnalytics();
                            }}
                            className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                          >
                            <Download className="w-4 h-4" />
                            <span>Download Daily Report</span>
                          </button>
                        </div>
                      </div>

                      {/* Weekly Report */}
                      <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="bg-green-100 p-3 rounded-lg">
                              <Calendar className="w-6 h-6 text-green-600" />
                            </div>
                            <div>
                              <h3 className="text-lg font-bold text-gray-800">Weekly Report</h3>
                              <p className="text-sm text-gray-600">Last 7 days summary and trends</p>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-xs text-gray-600 mb-1">Report Period</p>
                            <p className="font-semibold text-gray-800">
                              {(() => {
                                const endDate = new Date();
                                const startDate = new Date();
                                startDate.setDate(startDate.getDate() - 6);
                                return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
                              })()}
                            </p>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="bg-green-50 rounded p-2 text-center">
                              <p className="text-xl font-bold text-green-600">
                                {(() => {
                                  const weekAgo = new Date();
                                  weekAgo.setDate(weekAgo.getDate() - 6);
                                  return visitLog.filter(v => new Date(v.visitDate) >= weekAgo).length;
                                })()}
                              </p>
                              <p className="text-xs text-gray-600">Weekly Visits</p>
                            </div>
                            <div className="bg-green-50 rounded p-2 text-center">
                              <p className="text-xl font-bold text-green-600">
                                {(() => {
                                  const weekAgo = new Date();
                                  weekAgo.setDate(weekAgo.getDate() - 6);
                                  const weekVisits = visitLog.filter(v => new Date(v.visitDate) >= weekAgo).length;
                                  return (weekVisits / 7).toFixed(1);
                                })()}
                              </p>
                              <p className="text-xs text-gray-600">Daily Average</p>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setAnalyticsTimeRange('weekly');
                              exportAnalytics();
                            }}
                            className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                          >
                            <Download className="w-4 h-4" />
                            <span>Download Weekly Report</span>
                          </button>
                        </div>
                      </div>

                      {/* Monthly Report */}
                      <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-purple-500">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="bg-purple-100 p-3 rounded-lg">
                              <Calendar className="w-6 h-6 text-purple-600" />
                            </div>
                            <div>
                              <h3 className="text-lg font-bold text-gray-800">Monthly Report</h3>
                              <p className="text-sm text-gray-600">Current month comprehensive data</p>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-xs text-gray-600 mb-1">Report Month</p>
                            <p className="font-semibold text-gray-800">
                              {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                            </p>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="bg-purple-50 rounded p-2 text-center">
                              <p className="text-xl font-bold text-purple-600">
                                {(() => {
                                  const now = new Date();
                                  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
                                  return visitLog.filter(v => new Date(v.visitDate) >= firstDay).length;
                                })()}
                              </p>
                              <p className="text-xs text-gray-600">Monthly Visits</p>
                            </div>
                            <div className="bg-purple-50 rounded p-2 text-center">
                              <p className="text-xl font-bold text-purple-600">
                                {(() => {
                                  const now = new Date();
                                  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
                                  const newPatients = registeredPatients.filter(p => 
                                    new Date(p.registrationDate || p.registeredDate) >= firstDay
                                  ).length;
                                  return newPatients;
                                })()}
                              </p>
                              <p className="text-xs text-gray-600">New Patients</p>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setAnalyticsTimeRange('monthly');
                              exportAnalytics();
                            }}
                            className="w-full bg-purple-500 hover:bg-purple-600 text-white py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                          >
                            <Download className="w-4 h-4" />
                            <span>Download Monthly Report</span>
                          </button>
                        </div>
                      </div>

                      {/* Yearly Report */}
                      <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-orange-500">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="bg-orange-100 p-3 rounded-lg">
                              <Calendar className="w-6 h-6 text-orange-600" />
                            </div>
                            <div>
                              <h3 className="text-lg font-bold text-gray-800">Yearly Report</h3>
                              <p className="text-sm text-gray-600">Annual statistics and insights</p>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-xs text-gray-600 mb-1">Report Year</p>
                            <p className="font-semibold text-gray-800">{new Date().getFullYear()}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="bg-orange-50 rounded p-2 text-center">
                              <p className="text-xl font-bold text-orange-600">
                                {(() => {
                                  const now = new Date();
                                  const firstDay = new Date(now.getFullYear(), 0, 1);
                                  return visitLog.filter(v => new Date(v.visitDate) >= firstDay).length;
                                })()}
                              </p>
                              <p className="text-xs text-gray-600">Yearly Visits</p>
                            </div>
                            <div className="bg-orange-50 rounded p-2 text-center">
                              <p className="text-xl font-bold text-orange-600">
                                {(() => {
                                  const now = new Date();
                                  const firstDay = new Date(now.getFullYear(), 0, 1);
                                  const yearVisits = visitLog.filter(v => new Date(v.visitDate) >= firstDay).length;
                                  const monthsPassed = now.getMonth() + 1;
                                  return monthsPassed > 0 ? (yearVisits / monthsPassed).toFixed(0) : 0;
                                })()}
                              </p>
                              <p className="text-xs text-gray-600">Monthly Average</p>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setAnalyticsTimeRange('yearly');
                              exportAnalytics();
                            }}
                            className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                          >
                            <Download className="w-4 h-4" />
                            <span>Download Yearly Report</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Additional Export Options */}
                    <div className="bg-white rounded-xl shadow-md p-6">
                      <h3 className="text-lg font-bold text-gray-800 mb-4">Additional Exports</h3>
                      <div className="grid md:grid-cols-3 gap-4">
                        <button
                          onClick={exportPatients}
                          className="flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-800 py-3 px-4 rounded-lg font-semibold transition-colors"
                        >
                          <Users className="w-4 h-4" />
                          <span>Export All Patients</span>
                        </button>
                        <button
                          onClick={exportVisitLog}
                          className="flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-800 py-3 px-4 rounded-lg font-semibold transition-colors"
                        >
                          <List className="w-4 h-4" />
                          <span>Export Visit Log</span>
                        </button>
                        <button
                          onClick={() => {
                            const queueData = queue.map(q => ({
                              'Queue #': q.queueNumber,
                              'Patient ID': q.patientId,
                              'Name': q.name,
                              'Age': q.age,
                              'Sex': q.sex,
                              'Service': q.service,
                              'Priority': q.priority,
                              'Status': q.status,
                              'Time Queued': new Date(q.timeQueued).toLocaleString()
                            }));
                            exportToExcel(queueData, 'HealthTrack_Current_Queue');
                          }}
                          className="flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-800 py-3 px-4 rounded-lg font-semibold transition-colors"
                        >
                          <Clock className="w-4 h-4" />
                          <span>Export Current Queue</span>
                        </button>
                      </div>
                    </div>

                    {/* Report Information */}
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                      <h3 className="text-lg font-bold text-blue-900 mb-3">📊 About Reports</h3>
                      <ul className="space-y-2 text-sm text-blue-800">
                        <li className="flex items-start gap-2">
                          <span className="text-blue-600 mt-0.5">•</span>
                          <span><strong>Daily Reports</strong> include today's visit statistics, queue status, and patient flow</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-600 mt-0.5">•</span>
                          <span><strong>Weekly Reports</strong> show 7-day trends, daily averages, and service utilization patterns</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-600 mt-0.5">•</span>
                          <span><strong>Monthly Reports</strong> provide comprehensive month-to-date analytics and new patient registration</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-600 mt-0.5">•</span>
                          <span><strong>Yearly Reports</strong> summarize annual performance with month-by-month breakdowns</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-600 mt-0.5">•</span>
                          <span>All reports are exported in <strong>Excel format (.xlsx)</strong> with multiple sheets for easy analysis</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>


                {activeTab === 'accounts' && userRole === 'admin' && (
                  <div className="space-y-6">
                    <div className="bg-white rounded-xl shadow-md p-6">
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h2 className="text-xl font-bold text-gray-800">Account Management</h2>
                          <p className="text-sm text-gray-500 mt-1">Manage clinic staff and admin accounts. Residents register themselves via the public portal.</p>
                        </div>
                        <button
                          onClick={() => { setShowAdminAddAccount(true); setAdminAccountError(''); setAdminAccountSuccess(''); setAdminNewAccount({ username: '', password: '', confirmPassword: '', role: 'staff', firstName: '', middleInitial: '', lastName: '', email: '' }); }}
                          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                          Add Clinic Account
                        </button>
                      </div>

                      {/* Account type legend */}
                      <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-2">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                          </div>
                          <p className="font-bold text-blue-700 text-sm">Admin</p>
                          <p className="text-xs text-blue-500 mt-1">Full system access — clinic admin only</p>
                          <p className="text-2xl font-bold text-blue-600 mt-2">{users.filter(a => a.role === 'admin').length}</p>
                        </div>
                        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                          <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-2">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                          </div>
                          <p className="font-bold text-green-700 text-sm">Staff</p>
                          <p className="text-xs text-green-500 mt-1">Queue & patient management</p>
                          <p className="text-2xl font-bold text-green-600 mt-2">{users.filter(a => a.role === 'staff').length}</p>
                        </div>
                        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-center">
                          <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-2">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                          </div>
                          <p className="font-bold text-purple-700 text-sm">Resident</p>
                          <p className="text-xs text-purple-500 mt-1">Self-registered via public portal</p>
                          <p className="text-2xl font-bold text-purple-600 mt-2">{users.filter(a => a.role === 'resident').length}</p>
                        </div>
                      </div>

                      {/* Account list */}
                      <div className="space-y-2">
                        <h3 className="font-semibold text-gray-700 mb-3">All Accounts</h3>
                        {users.map(acc => {
                          const roleColors = {
                            admin:    { bg: 'bg-blue-100',   text: 'text-blue-700',   dot: 'bg-blue-500' },
                            staff:    { bg: 'bg-green-100',  text: 'text-green-700',  dot: 'bg-green-500' },
                            resident: { bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500' }
                          };
                          const rc = roleColors[acc.role] || roleColors.resident;
                          return (
                            <div key={acc.id} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-full flex items-center justify-center ${rc.bg}`}>
                                  <span className={`text-base font-bold ${rc.text}`}>{acc.fullName?.charAt(0) || acc.username?.charAt(0) || '?'}</span>
                                </div>
                                <div>
                                  <p className="font-semibold text-gray-800 text-sm">{acc.fullName}</p>
                                  <p className="text-xs text-gray-500">@{acc.username}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${rc.bg} ${rc.text}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${rc.dot}`}></span>
                                  {acc.role.charAt(0).toUpperCase() + acc.role.slice(1)}
                                </span>
                                <span className="text-xs text-gray-400">{acc.createdAt ? new Date(acc.createdAt).toLocaleDateString('en-PH') : '—'}</span>
                                {acc.username !== currentUser?.username && (
                                  <button
                                    onClick={() => { setDeleteAccountTarget(acc); setDeleteAccountError(''); }}
                                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                    title="Delete account"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}


                {activeTab === 'auditlog' && userRole === 'admin' && <AuditLogPanel api={api} List={List} />}
              {/* ── Delete Account Confirmation Modal ── */}
              {deleteAccountTarget && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
                  <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
                    <div className="p-6 text-center">
                      <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-7 h-7 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </div>
                      <h2 className="text-lg font-bold text-gray-800 mb-1">Delete Account</h2>
                      <p className="text-sm text-gray-500 mb-1">Are you sure you want to delete</p>
                      <p className="text-sm font-semibold text-gray-800 mb-1">{deleteAccountTarget.fullName}</p>
                      <p className="text-xs text-gray-400 mb-4">@{deleteAccountTarget.username} · {deleteAccountTarget.role}</p>
                      <p className="text-xs text-red-500 mb-4">This action cannot be undone.</p>
                      {deleteAccountError && <p className="text-xs text-red-500 mb-3">{deleteAccountError}</p>}
                      <div className="flex gap-3">
                        <button
                          onClick={() => { setDeleteAccountTarget(null); setDeleteAccountError(''); }}
                          className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                        >Cancel</button>
                        <button
                          onClick={handleDeleteAccount}
                          className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-colors"
                        >Delete</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Admin Add Clinic Account Modal ── */}
              {showAdminAddAccount && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
                  <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                    <div className="flex items-center justify-between px-6 py-4 border-b">
                      <div>
                        <h2 className="text-lg font-bold text-gray-800">Add Clinic Account</h2>
                        <p className="text-xs text-gray-500 mt-0.5">Create an admin or staff account for clinic personnel</p>
                      </div>
                      <button onClick={() => setShowAdminAddAccount(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
                    </div>
                    <div className="p-6 space-y-4">
                      {/* Role selector — admin/staff only */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Account Role <span className="text-red-500">*</span></label>
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { value: 'admin', label: 'Admin', desc: 'Full system access', color: '#CC0000', bg: '#fff0f0' },
                            { value: 'staff', label: 'Staff', desc: 'Queue & patients', color: '#111827', bg: '#f3f4f6' }
                          ].map(r => (
                            <button
                              key={r.value}
                              type="button"
                              onClick={() => setAdminNewAccount({...adminNewAccount, role: r.value})}
                              className="p-3 rounded-xl border-2 text-center transition-all"
                              style={adminNewAccount.role === r.value
                                ? { borderColor: r.color, backgroundColor: r.bg, color: r.color }
                                : { borderColor: '#e5e7eb', color: '#6b7280' }}
                            >
                              <p className="font-bold text-sm">{r.label}</p>
                              <p className="text-xs opacity-75 mt-0.5">{r.desc}</p>
                            </button>
                          ))}
                        </div>
                        <div className="mt-2 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                          <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          <p className="text-xs text-amber-700">Only create accounts for verified clinic personnel. Residents register via the public portal.</p>
                        </div>
                      </div>

                      {/* Name fields */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">First Name <span className="text-red-500">*</span></label>
                          <input value={adminNewAccount.firstName} onChange={e => setAdminNewAccount({...adminNewAccount, firstName: e.target.value})}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="First name" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Last Name <span className="text-red-500">*</span></label>
                          <input value={adminNewAccount.lastName} onChange={e => setAdminNewAccount({...adminNewAccount, lastName: e.target.value})}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Last name" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">M.I.</label>
                          <input value={adminNewAccount.middleInitial} maxLength={1}
                            onChange={e => setAdminNewAccount({...adminNewAccount, middleInitial: e.target.value.toUpperCase()})}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="A" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                          <input value={adminNewAccount.email} onChange={e => setAdminNewAccount({...adminNewAccount, email: e.target.value})}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="clinic@email.com" />
                        </div>
                      </div>

                      {/* Username & Password */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Username <span className="text-red-500">*</span></label>
                        <input value={adminNewAccount.username} onChange={e => setAdminNewAccount({...adminNewAccount, username: e.target.value})}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="e.g. drjuandelacruz" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Password <span className="text-red-500">*</span></label>
                          <input type="password" value={adminNewAccount.password} onChange={e => setAdminNewAccount({...adminNewAccount, password: e.target.value})}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Min 8 chars" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Confirm Password <span className="text-red-500">*</span></label>
                          <input type="password" value={adminNewAccount.confirmPassword} onChange={e => setAdminNewAccount({...adminNewAccount, confirmPassword: e.target.value})}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Repeat password" />
                        </div>
                      </div>

                      {adminAccountError && (
                        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                          <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          <p className="text-sm text-red-600">{adminAccountError}</p>
                        </div>
                      )}
                      {adminAccountSuccess && (
                        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                          <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                          <p className="text-sm text-green-600">{adminAccountSuccess}</p>
                        </div>
                      )}

                      <div className="flex gap-3 pt-2">
                        <button onClick={() => setShowAdminAddAccount(false)}
                          className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-xl font-semibold text-sm hover:bg-gray-50 transition-colors">
                          Cancel
                        </button>
                        <button
                          onClick={() => {
                            setAdminAccountError('');
                            setAdminAccountSuccess('');
                            const { username, password, confirmPassword, role, firstName, lastName, middleInitial, email } = adminNewAccount;
                            if (!firstName.trim() || !lastName.trim()) { setAdminAccountError('First and last name are required.'); return; }
                            if (!username.trim() || username.trim().length < 3) { setAdminAccountError('Username must be at least 3 characters.'); return; }
                            const pwErr = validatePassword(password);
                            if (pwErr) { setAdminAccountError(pwErr); return; }
                            if (password !== confirmPassword) { setAdminAccountError('Passwords do not match.'); return; }
                            if (!['admin','staff'].includes(role)) { setAdminAccountError('Invalid role for clinic account.'); return; }
                            // POST to /api/auth/register with admin JWT (backend enforces admin-only for staff/admin roles)
                            api('POST', '/auth/register', {
                              username, password, role,
                              firstName: firstName.trim(), middleInitial: middleInitial.trim(), lastName: lastName.trim(),
                              email: email.trim() || undefined,
                            }).then(data => {
                              const newUser = normalizeUser(data.user || {});
                              setUsers(prev => [newUser, ...prev]);
                              writeAudit('ACCOUNT_CREATED', `Created ${role} account: @${username.trim().toLowerCase()}`);
                              setAdminAccountSuccess(`${role.charAt(0).toUpperCase()+role.slice(1)} account "@${username.trim().toLowerCase()}" created successfully.`);
                              setAdminNewAccount({ username:'', password:'', confirmPassword:'', role:'staff', firstName:'', middleInitial:'', lastName:'', email:'' });
                            }).catch(err => setAdminAccountError(err.message || 'Failed to create account.'));
                          }}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl font-semibold text-sm transition-colors"
                        >
                          Create Account
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {/* MODALS */}
              {/* Register Patient Modal */}
              {showRegisterPatient && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                  <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                    <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
                      <h2 className="text-2xl font-bold text-gray-800">Register New Patient</h2>
                      <button
                        onClick={() => setShowRegisterPatient(false)}
                        className="text-gray-500 hover:text-gray-700 text-2xl"
                      >
                        ×
                      </button>
                    </div>
                    <div className="p-6">
                      <div className="grid md:grid-cols-2 gap-4">
                        {/* Personal Information */}
                        <div className="md:col-span-2">
                          <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b">Personal Information</h3>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Last Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={newPatient.lastName}
                            onChange={(e) => setNewPatient({...newPatient, lastName: e.target.value})}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            First Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={newPatient.firstName}
                            onChange={(e) => setNewPatient({...newPatient, firstName: e.target.value})}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Middle Name
                          </label>
                          <input
                            type="text"
                            value={newPatient.middleName}
                            onChange={(e) => setNewPatient({...newPatient, middleName: e.target.value})}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Date of Birth <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="date"
                            value={newPatient.dateOfBirth}
                            onChange={(e) => setNewPatient({...newPatient, dateOfBirth: e.target.value})}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Sex <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={newPatient.sex}
                            onChange={(e) => setNewPatient({...newPatient, sex: e.target.value})}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="">Select</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Civil Status
                          </label>
                          <select
                            value={newPatient.civilStatus}
                            onChange={(e) => {
                              if (!validateCivilStatus(newPatient.dateOfBirth, e.target.value)) {
                                alert('⚠️ Under RA 11596 (Prohibition of Child Marriage Act), the minimum age for marriage in the Philippines is 18 years old. Please select Single for patients under 18.');
                                return;
                              }
                              setNewPatient({...newPatient, civilStatus: e.target.value});
                            }}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="">Select</option>
                            <option value="Single">Single</option>
                            <option value="Married">Married</option>
                            <option value="Widowed">Widowed</option>
                            <option value="Separated">Separated</option>
                          </select>
                        </div>

                        {/* Contact Information */}
                        <div className="md:col-span-2 mt-4">
                          <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b">Contact Information</h3>
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Address <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={newPatient.address}
                            onChange={(e) => setNewPatient({...newPatient, address: e.target.value})}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Contact Number <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="tel"
                            value={newPatient.contact}
                            onChange={(e) => setNewPatient({...newPatient, contact: sanitizePhone(e.target.value).slice(0,12)})}
                            placeholder="09XXXXXXXXX or 8-digit landline"
                            maxLength={12}
                            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${phoneClass(newPatient.contact)}`}
                          />
                          <PhoneMsg val={newPatient.contact} />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Occupation
                          </label>
                          <input
                            type="text"
                            value={newPatient.occupation}
                            onChange={(e) => setNewPatient({...newPatient, occupation: e.target.value})}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            PWD ID Number <span className="text-gray-400 font-normal">(optional)</span>
                          </label>
                          <input
                            type="text"
                            value={newPatient.pwdId || ''}
                            onChange={(e) => setNewPatient({...newPatient, pwdId: e.target.value})}
                            placeholder="e.g. PWD-2024-XXXXX"
                            className="w-full px-4 py-2 border border-blue-200 bg-blue-50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          <p className="text-xs text-blue-600 mt-1">♿ Auto-sets Priority Case in queue</p>
                        </div>
                        <div className="md:col-span-2 mt-4">
                          <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b">Emergency Contact</h3>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Emergency Contact Person
                          </label>
                          <input
                            type="text"
                            value={newPatient.emergencyContactPerson}
                            onChange={(e) => setNewPatient({...newPatient, emergencyContactPerson: e.target.value})}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Emergency Contact Number
                          </label>
                          <input
                            type="tel"
                            value={newPatient.emergencyContactNumber}
                            onChange={(e) => setNewPatient({...newPatient, emergencyContactNumber: sanitizePhone(e.target.value).slice(0,12)})}
                            placeholder="09XXXXXXXXX or 8-digit landline" maxLength={12}
                            maxLength={16}
                            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${phoneClass(newPatient.emergencyContactNumber)}`}
                          />
                          <PhoneMsg val={newPatient.emergencyContactNumber} />
                        </div>

                        {/* Medical Information */}
                        <div className="md:col-span-2 mt-4">
                          <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b">Medical Information</h3>
                        </div>

                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <label className="block text-sm font-semibold text-gray-700">Allergies</label>
                            <button type="button" onClick={() => setNewPatient({...newPatient, allergies: 'None'})} className="text-xs text-blue-500 hover:text-blue-700 font-medium">+ None</button>
                          </div>
                          <input
                            type="text"
                            value={newPatient.allergies}
                            onChange={(e) => setNewPatient({...newPatient, allergies: e.target.value})}
                            placeholder="e.g., Penicillin, Peanuts"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <div className="flex justify-between items-center mb-2">
                            <label className="block text-sm font-semibold text-gray-700">Chronic Conditions</label>
                            <button type="button" onClick={() => setNewPatient({...newPatient, chronicConditions: 'None'})} className="text-xs text-blue-500 hover:text-blue-700 font-medium">+ None</button>
                          </div>
                          <input
                            type="text"
                            value={newPatient.chronicConditions}
                            onChange={(e) => setNewPatient({...newPatient, chronicConditions: e.target.value})}
                            placeholder="e.g., Hypertension, Diabetes"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <div className="flex justify-between items-center mb-2">
                            <label className="block text-sm font-semibold text-gray-700">Current Medications</label>
                            <button type="button" onClick={() => setNewPatient({...newPatient, currentMedications: 'None'})} className="text-xs text-blue-500 hover:text-blue-700 font-medium">+ None</button>
                          </div>
                          <textarea
                            value={newPatient.currentMedications}
                            onChange={(e) => setNewPatient({...newPatient, currentMedications: e.target.value})}
                            placeholder="List current medications"
                            rows={3}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </div>

                      {/* ── Add to Queue Now toggle ── */}
                      <div className="mt-6 border-t pt-5">
                        <label className="flex items-center gap-3 cursor-pointer select-none">
                          <input type="checkbox" checked={newPatient.addToQueueNow}
                            onChange={e => setNewPatient({...newPatient, addToQueueNow: e.target.checked, queueServiceCategory:'', queueServiceType:'', queuePriority:'Regular', queueReason:''})}
                            className="w-5 h-5 rounded border-gray-300 text-red-600 focus:ring-red-400" />
                          <div>
                            <p className="text-sm font-bold text-gray-800">➕ Add to Queue Immediately</p>
                            <p className="text-xs text-gray-500">Register and queue this patient in one step</p>
                          </div>
                        </label>

                        {newPatient.addToQueueNow && (
                          <div className="mt-4 bg-orange-50 border border-orange-200 rounded-xl p-4 space-y-3">
                            <p className="text-sm font-bold text-orange-800">Queue Details</p>
                            <div>
                              <label className="block text-xs font-semibold text-gray-700 mb-1">{t('serviceCategory')} <span className="text-red-500">*</span></label>
                              <select value={newPatient.queueServiceCategory}
                                onChange={e => setNewPatient({...newPatient, queueServiceCategory: e.target.value, queueServiceType:'', queuePriority:'Regular'})}
                                className="w-full px-3 py-2 border border-orange-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400">
                                <option value="">-- Select Service Category --</option>
                                {Object.keys(SERVICE_CATEGORIES).filter(c => SERVICE_CATEGORIES[c].enabled !== false).map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-700 mb-1">{t('serviceType')} <span className="text-red-500">*</span></label>
                              <select value={newPatient.queueServiceType}
                                onChange={e => { const s = SERVICE_CATEGORIES[newPatient.queueServiceCategory]?.services.find(sv => sv.name === e.target.value); setNewPatient({...newPatient, queueServiceType: e.target.value, queuePriority: s?.priority || 'Regular'}); }}
                                disabled={!newPatient.queueServiceCategory}
                                className="w-full px-3 py-2 border border-orange-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 disabled:bg-gray-100">
                                <option value="">{newPatient.queueServiceCategory ? '-- Select Service Type --' : 'Select category first'}</option>
                                {newPatient.queueServiceCategory && SERVICE_CATEGORIES[newPatient.queueServiceCategory]?.services.filter(s => s.enabled !== false).map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                              </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">{t('priorityLevel')}</label>
                                <select value={newPatient.queuePriority} onChange={e => setNewPatient({...newPatient, queuePriority: e.target.value})}
                                  className="w-full px-3 py-2 border border-orange-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400">
                                  <option value="Regular">Regular</option>
                                  <option value="Urgent">Urgent</option>
                                  <option value="Priority Case">Priority Case</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Reason for Visit <span className="text-red-500">*</span></label>
                                <input type="text" value={newPatient.queueReason} onChange={e => setNewPatient({...newPatient, queueReason: e.target.value})}
                                  placeholder="Chief complaint"
                                  className="w-full px-3 py-2 border border-orange-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400" />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex justify-end space-x-3 mt-4 pt-4 border-t">
                        <button
                          onClick={() => setShowRegisterPatient(false)}
                          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={registerPatient}
                          className="px-6 py-2 text-white rounded-lg font-semibold transition-all transform hover:scale-105"
                          style={{background: newPatient.addToQueueNow ? 'linear-gradient(to right,#ea580c,#dc2626)' : 'linear-gradient(to right,#3b82f6,#2563eb)'}}
                        >
                          {newPatient.addToQueueNow ? '✅ Register & Add to Queue' : 'Register Patient'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Add to Queue Modal — Option 1: Simple with filtered dropdown */}
              {showAddToQueue && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                  <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
                    <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-4 rounded-t-xl flex justify-between items-center flex-shrink-0">
                      <div>
                        <h2 className="text-xl font-bold">Add Patient to Queue</h2>
                        <p className="text-white/80 text-xs mt-0.5">Walk-in patients arriving at the clinic</p>
                      </div>
                      <button onClick={() => { setShowAddToQueue(false); setQueuePatient({patientId:'',serviceCategory:'',serviceType:'',priority:'Regular',chiefComplaint:''}); }}
                        className="text-white hover:text-gray-200 text-2xl">×</button>
                    </div>

                    <div className="overflow-y-auto flex-1 p-6 space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Select Patient <span className="text-red-500">*</span></label>
                        <select value={queuePatient.patientId} onChange={(e) => setQueuePatient({...queuePatient, patientId: e.target.value})}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent">
                          <option value="">-- Select Patient --</option>
                          <option value="WALKIN_UNREGISTERED">🚶 Walk-in (Unregistered / No Patient ID)</option>
                          {registeredPatients
                            .filter(p => {
                              // Hide patients already active in queue
                              if (queue.some(q => q.patientId === p.patientId && ['Waiting','Accepted'].includes(q.status))) return false;
                              // Hide self-registered residents (have a matching user account)
                              const hasAccount = users.some(u =>
                                u.role === 'resident' && (
                                  (u.fullName || '').toLowerCase().includes((p.firstName || '').toLowerCase()) &&
                                  (u.fullName || '').toLowerCase().includes((p.lastName || '').toLowerCase()) &&
                                  (p.firstName || '').length > 0
                                )
                              );
                              return !hasAccount;
                            })
                            .map(p => (
                              <option key={p.patientId} value={p.patientId}>
                                {p.patientId} — {p.firstName} {p.lastName} (Age: {p.age || 'N/A'}, Sex: {p.sex || 'N/A'})
                              </option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-400 mt-1">Showing staff-registered walk-in patients only</p>

                        {/* Patient info preview when selected */}
                        {queuePatient.patientId && queuePatient.patientId !== 'WALKIN_UNREGISTERED' && (() => {
                          const sel = registeredPatients.find(p => p.patientId === queuePatient.patientId);
                          if (!sel) return null;
                          return (
                            <div className="mt-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-base flex-shrink-0">
                                {sel.firstName?.[0]?.toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-gray-800 text-sm">{sel.firstName} {sel.lastName}</p>
                                <p className="text-xs text-gray-500">{sel.patientId} · Age: {sel.age || 'N/A'} · Sex: {sel.sex || 'N/A'} · {sel.contactNumber || 'No contact'}</p>
                                {sel.allergies && <p className="text-xs text-red-600 mt-0.5">⚠️ Allergies: {sel.allergies}</p>}
                              </div>
                            </div>
                          );
                        })()}

                        {queuePatient.patientId === 'WALKIN_UNREGISTERED' && (
                          <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                            <p className="text-xs text-amber-700">⚠️ Unregistered walk-in. Please register them in the Patients tab after their visit for complete records.</p>
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">{t('serviceCategory')} <span className="text-red-500">*</span></label>
                        <select value={queuePatient.serviceCategory}
                          onChange={(e) => setQueuePatient({...queuePatient, serviceCategory: e.target.value, serviceType:'', priority:'Regular'})}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent">
                          <option value="">-- Select Service Category --</option>
                          {Object.keys(SERVICE_CATEGORIES).filter(c => SERVICE_CATEGORIES[c].enabled !== false).map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">{t('serviceType')} <span className="text-red-500">*</span></label>
                        <select value={queuePatient.serviceType}
                          onChange={(e) => { const s = SERVICE_CATEGORIES[queuePatient.serviceCategory]?.services.find(sv => sv.name === e.target.value); setQueuePatient({...queuePatient, serviceType: e.target.value, priority: s?.priority || 'Regular'}); }}
                          disabled={!queuePatient.serviceCategory}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed">
                          <option value="">{queuePatient.serviceCategory ? '-- Select Service Type --' : 'Please select a service category first'}</option>
                          {queuePatient.serviceCategory && SERVICE_CATEGORIES[queuePatient.serviceCategory]?.services.filter(s => s.enabled !== false).map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">{t('priorityLevel')} <span className="text-red-500">*</span></label>
                        <select value={queuePatient.priority} onChange={(e) => setQueuePatient({...queuePatient, priority: e.target.value})}
                          disabled={!queuePatient.serviceType}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed">
                          <option value="Regular">Regular</option>
                          <option value="Urgent">Urgent</option>
                          <option value="Priority Case">Priority Case</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-1">Auto-filled based on service type, but can be changed</p>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Reason for Visit <span className="text-red-500">*</span></label>
                        <textarea value={queuePatient.chiefComplaint} onChange={(e) => setQueuePatient({...queuePatient, chiefComplaint: e.target.value})}
                          placeholder="Describe the patient's complaint or reason for visit"
                          rows={3} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none" />
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 px-6 py-4 border-t flex-shrink-0">
                      <button onClick={() => { setShowAddToQueue(false); setQueuePatient({patientId:'',serviceCategory:'',serviceType:'',priority:'Regular',chiefComplaint:''}); }}
                        className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-semibold">Cancel</button>
                      <button onClick={addToQueue}
                        className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-semibold shadow-md">
                        Add to Queue
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* View Patient Details Modal */}
              {selectedPatient && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                  <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                    <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-4 rounded-t-xl flex justify-between items-center">
                      <h2 className="text-2xl font-bold">Patient Details</h2>
                      <button
                        onClick={() => setSelectedPatient(null)}
                        className="text-white hover:text-gray-200 text-2xl"
                      >
                        ×
                      </button>
                    </div>
                    <div className="p-6">
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-800 mb-3 pb-2 border-b">Personal Information</h3>
                          <div className="space-y-2">
                            <p className="text-sm"><span className="font-medium text-gray-600">Patient ID:</span> <span className="text-gray-800">{selectedPatient.patientId}</span></p>
                            <p className="text-sm"><span className="font-medium text-gray-600">Name:</span> <span className="text-gray-800">{selectedPatient.firstName} {selectedPatient.middleName} {selectedPatient.lastName}</span></p>
                            <p className="text-sm"><span className="font-medium text-gray-600">Date of Birth:</span> <span className="text-gray-800">{new Date(selectedPatient.dateOfBirth).toLocaleDateString()}</span></p>
                            <p className="text-sm"><span className="font-medium text-gray-600">Age:</span> <span className="text-gray-800">{selectedPatient.age}</span></p>
                            <p className="text-sm"><span className="font-medium text-gray-600">Sex:</span> <span className="text-gray-800">{selectedPatient.sex}</span></p>
                            <p className="text-sm"><span className="font-medium text-gray-600">Civil Status:</span> <span className="text-gray-800">{selectedPatient.civilStatus || 'N/A'}</span></p>
                            <p className="text-sm"><span className="font-medium text-gray-600">Occupation:</span> <span className="text-gray-800">{selectedPatient.occupation || 'N/A'}</span></p>
                          </div>
                        </div>

                        <div>
                          <h3 className="text-lg font-semibold text-gray-800 mb-3 pb-2 border-b">Contact Information</h3>
                          <div className="space-y-2">
                            <p className="text-sm"><span className="font-medium text-gray-600">Address:</span> <span className="text-gray-800">{selectedPatient.address}</span></p>
                            <p className="text-sm"><span className="font-medium text-gray-600">Contact:</span> <span className="text-gray-800">{selectedPatient.contact}</span></p>
                            <p className="text-sm"><span className="font-medium text-gray-600">Emergency Contact:</span> <span className="text-gray-800">{selectedPatient.emergencyContactPerson || 'N/A'}</span></p>
                            <p className="text-sm"><span className="font-medium text-gray-600">Emergency Number:</span> <span className="text-gray-800">{selectedPatient.emergencyContactNumber || 'N/A'}</span></p>
                          </div>
                        </div>

                        <div className="md:col-span-2">
                          <h3 className="text-lg font-semibold text-gray-800 mb-3 pb-2 border-b">Medical Information</h3>
                          <div className="space-y-2">

                            <p className="text-sm"><span className="font-medium text-gray-600">Allergies:</span> <span className="text-gray-800">{selectedPatient.allergies || 'None'}</span></p>
                            <p className="text-sm"><span className="font-medium text-gray-600">Chronic Conditions:</span> <span className="text-gray-800">{selectedPatient.chronicConditions || 'None'}</span></p>
                            <p className="text-sm"><span className="font-medium text-gray-600">Current Medications:</span> <span className="text-gray-800">{selectedPatient.currentMedications || 'None'}</span></p>
                          </div>
                        </div>
                      </div>

                      {/* Visit History Section */}
                      {(() => {
                        const patVisits = visitLog
                          .filter(v => {
                            if (!v) return false;
                            // Match by patientId (primary)
                            if (v.patientId && selectedPatient.patientId && v.patientId === selectedPatient.patientId) return true;
                            // Fallback: match by name
                            const vName = (v.name || '').toLowerCase().trim();
                            const pName = (selectedPatient.firstName + ' ' + selectedPatient.lastName).toLowerCase().trim();
                            const pNameAlt = (selectedPatient.lastName + ' ' + selectedPatient.firstName).toLowerCase().trim();
                            if (vName && pName && (vName === pName || vName === pNameAlt || vName.includes(selectedPatient.firstName?.toLowerCase()) && vName.includes(selectedPatient.lastName?.toLowerCase()))) return true;
                            return false;
                          })
                          .sort((a, b) => new Date(b.visitDate) - new Date(a.visitDate));

                        const printHistory = () => {
                          const win = window.open('', '_blank');
                          win.document.write(`
                            <html><head><title>Visit History - ${selectedPatient.firstName} ${selectedPatient.lastName}</title>
                            <style>
                              body { font-family: Arial, sans-serif; padding: 24px; color: #333; }
                              .header { border-bottom: 3px solid #cc0000; padding-bottom: 16px; margin-bottom: 20px; }
                              .logo-row { display: flex; align-items: center; gap: 16px; margin-bottom: 8px; }
                              h1 { color: #cc0000; font-size: 22px; margin: 0; }
                              h2 { font-size: 15px; color: #555; margin: 4px 0 0; }
                              .patient-info { background: #f8f8f8; border: 1px solid #ddd; border-radius: 8px; padding: 14px; margin-bottom: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
                              .patient-info p { margin: 2px 0; font-size: 13px; }
                              .visit { border: 1px solid #e0e0e0; border-radius: 8px; padding: 14px; margin-bottom: 14px; page-break-inside: avoid; }
                              .visit-header { display: flex; justify-content: space-between; margin-bottom: 6px; }
                              .visit-service { font-weight: bold; font-size: 14px; color: #cc0000; }
                              .visit-date { font-size: 12px; color: #888; }
                              .visit-detail { font-size: 13px; margin: 3px 0; }
                              .badge { background: #cc0000; color: white; font-size: 11px; padding: 2px 8px; border-radius: 12px; }
                              .footer { margin-top: 30px; border-top: 1px solid #ddd; padding-top: 12px; font-size: 11px; color: #999; text-align: center; }
                              @media print { body { padding: 12px; } }
                            </style></head><body>
                            <div class="header">
                              <div class="logo-row">
                                <div><h1>HealthTrack</h1><h2>Patient Information System with Queueing</h2><h2>Barangay Upper Bicutan Health Clinics - City of Taguig</h2></div>
                              </div>
                              <h2 style="margin-top:12px;font-size:16px;color:#333;">Patient Visit History Report</h2>
                            </div>
                            <div class="patient-info">
                              <p><strong>Patient ID:</strong> ${selectedPatient.patientId}</p>
                              <p><strong>Name:</strong> ${selectedPatient.firstName} ${selectedPatient.middleName || ''} ${selectedPatient.lastName}</p>
                              <p><strong>Date of Birth:</strong> ${selectedPatient.dateOfBirth ? new Date(selectedPatient.dateOfBirth).toLocaleDateString('en-PH') : 'N/A'}</p>
                              <p><strong>Age:</strong> ${selectedPatient.age || 'N/A'}</p>
                              <p><strong>Sex:</strong> ${selectedPatient.sex || 'N/A'}</p>
                              <p><strong>Contact:</strong> ${selectedPatient.contactNumber || 'N/A'}</p>
                              <p><strong>Address:</strong> ${selectedPatient.address || 'N/A'}</p>
                              <p><strong>Total Visits:</strong> ${patVisits.length}</p>
                            </div>
                            ${patVisits.length === 0 ? '<p style="color:#999;text-align:center;padding:20px">No visit records found.</p>' :
                              patVisits.map(v => `
                                <div class="visit">
                                  <div class="visit-header">
                                    <span class="visit-service">${v.service || 'N/A'}</span>
                                    <span class="badge">${v.priority || 'Regular'}</span>
                                  </div>
                                  <p class="visit-date">📅 ${v.visitDate ? new Date(v.visitDate).toLocaleDateString('en-PH', {weekday:'long',year:'numeric',month:'long',day:'numeric'}) : 'N/A'}</p>
                                  ${v.serviceCategory ? `<p class="visit-detail"><strong>Category:</strong> ${v.serviceCategory}</p>` : ''}
                                  ${v.chiefComplaint ? `<p class="visit-detail"><strong>Reason for Visit:</strong> ${v.chiefComplaint}</p>` : ''}
                                  ${v.diagnosis ? `<p class="visit-detail"><strong>Diagnosis:</strong> ${v.diagnosis}</p>` : ''}
                                  ${v.treatment ? `<p class="visit-detail"><strong>Treatment:</strong> ${v.treatment}</p>` : ''}
                                  ${v.prescription ? `<p class="visit-detail"><strong>Prescription:</strong> ${v.prescription}</p>` : ''}
                                  ${v.notes ? `<p class="visit-detail"><strong>Notes:</strong> ${v.notes}</p>` : ''}
                                </div>`).join('')}
                            <div class="footer">
                              Printed on ${new Date().toLocaleDateString('en-PH', {year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'})} &nbsp;|&nbsp; HealthTrack — FOR CAPSTONE PROJECT USE ONLY
                            </div>
                            </body></html>`);
                          win.document.close();
                          win.focus();
                          setTimeout(() => { win.print(); }, 500);
                        };

                        return (
                          <div className="mt-6 pt-4 border-t">
                            <div className="flex items-center justify-between mb-3">
                              <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                                📋 Visit History
                                <span className="text-xs font-normal bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{patVisits.length} record{patVisits.length !== 1 ? 's' : ''}</span>
                              </h3>
                              <button onClick={printHistory}
                                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors">
                                🖨️ Print / Save PDF
                              </button>
                            </div>
                            {patVisits.length === 0 ? (
                              <p className="text-sm text-gray-400 italic py-3 text-center">No visit records yet.</p>
                            ) : (
                              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                                {patVisits.map((v, i) => (
                                  <div key={i} className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                                    <div className="flex items-center justify-between mb-1">
                                      <p className="text-sm font-semibold text-gray-800">{v.service}</p>
                                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${priorityLevels[v.priority]?.color || 'bg-gray-400'} text-white`}>{v.priority}</span>
                                    </div>
                                    <p className="text-xs text-gray-500">{new Date(v.visitDate).toLocaleDateString('en-PH', {year:'numeric',month:'long',day:'numeric'})}</p>
                                    {v.chiefComplaint && <p className="text-xs text-gray-600 mt-1"><span className="font-medium">Reason:</span> {v.chiefComplaint}</p>}
                                    {v.diagnosis && <p className="text-xs text-gray-600"><span className="font-medium">Diagnosis:</span> {v.diagnosis}</p>}
                                    {v.treatment && <p className="text-xs text-gray-600"><span className="font-medium">Treatment:</span> {v.treatment}</p>}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      <div className="flex justify-end mt-6 pt-4 border-t">
                        <button
                          onClick={() => setSelectedPatient(null)}
                          className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition-colors"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ===== THEME CUSTOMIZER PANEL ===== */}
              {activeTab === 'theme' && userRole === 'admin' && (() => {
                const PRESETS = [
                  { name: 'Barangay Red', primary: '#CC0000', accent: '#990000', bg: '#f8fafc' },
                  { name: 'Crimson',      primary: '#B00000', accent: '#660000', bg: '#fff5f5' },
                  { name: 'Bright Scarlet',primary: '#E60000', accent: '#990000', bg: '#ffffff' },
                  { name: 'Deep Maroon',  primary: '#8A0000', accent: '#1a1a1a', bg: '#fff0f0' },
                  { name: 'Ink & Red',    primary: '#CC0000', accent: '#111827', bg: '#f9fafb' },
                  { name: 'Charcoal',     primary: '#1a1a1a', accent: '#CC0000', bg: '#f8fafc' },
                  { name: 'Classic',      primary: '#A30000', accent: '#000000', bg: '#ffffff' },
                  { name: 'Cherry',       primary: '#D32027', accent: '#7a0000', bg: '#fff5f5' },
                ];
                return (
                  <div className="max-w-3xl mx-auto">
                    {/* Header */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-6">
                      <div className="px-6 py-5 border-b border-gray-100" style={{background:'linear-gradient(to right,var(--ht-primary),var(--ht-accent))'}}>
                        <h2 className="text-xl font-bold text-white">🎨 Theme Customizer</h2>
                        <p className="text-sm text-white" style={{opacity:.85}}>Personalize the app colors for Barangay Upper Bicutan Health Clinics</p>
                      </div>

                      {/* Live Preview Bar */}
                      <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Live Preview</p>
                        <div className="flex items-center gap-3 flex-wrap">
                          <div className="h-10 flex-1 rounded-lg min-w-[120px]" style={{background:`linear-gradient(to right,var(--ht-primary),var(--ht-accent))`}}></div>
                          <div className="h-10 w-10 rounded-lg flex-shrink-0" style={{background:'var(--ht-primary)'}}></div>
                          <div className="h-10 w-10 rounded-lg flex-shrink-0" style={{background:'var(--ht-accent)'}}></div>
                          <div className="h-10 w-10 rounded-lg flex-shrink-0 border border-gray-300" style={{background:'var(--ht-bg)'}}></div>
                          <button className="px-4 py-2 rounded-lg text-white text-sm font-semibold" style={{background:'var(--ht-primary)'}}>Button</button>
                          <button className="px-4 py-2 rounded-lg text-white text-sm font-semibold" style={{background:'linear-gradient(to right,var(--ht-primary),var(--ht-accent))'}}>Gradient</button>
                        </div>
                      </div>

                      {/* Color Pickers */}
                      <div className="px-6 py-5 grid grid-cols-3 gap-5">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Primary Color</label>
                          <div className="flex items-center gap-3">
                            <input type="color" value={theme.primary}
                              onChange={e => saveTheme({...theme, primary: e.target.value})}
                              className="w-12 h-10 rounded-lg border border-gray-300 cursor-pointer p-0.5"
                            />
                            <code className="text-sm bg-gray-100 px-2 py-1 rounded font-mono">{theme.primary}</code>
                          </div>
                          <p className="text-xs text-gray-400 mt-1.5">Headers, buttons, nav active</p>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Accent Color</label>
                          <div className="flex items-center gap-3">
                            <input type="color" value={theme.accent}
                              onChange={e => saveTheme({...theme, accent: e.target.value})}
                              className="w-12 h-10 rounded-lg border border-gray-300 cursor-pointer p-0.5"
                            />
                            <code className="text-sm bg-gray-100 px-2 py-1 rounded font-mono">{theme.accent}</code>
                          </div>
                          <p className="text-xs text-gray-400 mt-1.5">Gradient end, highlights</p>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Background Color</label>
                          <div className="flex items-center gap-3">
                            <input type="color" value={theme.bg}
                              onChange={e => saveTheme({...theme, bg: e.target.value})}
                              className="w-12 h-10 rounded-lg border border-gray-300 cursor-pointer p-0.5"
                            />
                            <code className="text-sm bg-gray-100 px-2 py-1 rounded font-mono">{theme.bg}</code>
                          </div>
                          <p className="text-xs text-gray-400 mt-1.5">Page background</p>
                        </div>
                      </div>
                    </div>

                    {/* Preset Themes */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
                      <h3 className="text-base font-bold text-gray-800 mb-4">Quick Presets</h3>
                      <div className="grid grid-cols-4 gap-3">
                        {PRESETS.map(p => (
                          <button key={p.name}
                            onClick={() => saveTheme({primary: p.primary, accent: p.accent, bg: p.bg})}
                            className="group rounded-xl border-2 overflow-hidden transition-all hover:scale-105"
                            style={{borderColor: theme.primary === p.primary && theme.accent === p.accent ? p.primary : '#e5e7eb'}}
                          >
                            <div className="h-8" style={{background:`linear-gradient(to right,${p.primary},${p.accent})`}}></div>
                            <div className="h-5" style={{background: p.bg}}></div>
                            <div className="px-2 py-1.5 bg-white border-t border-gray-100">
                              <p className="text-xs font-semibold text-gray-700 truncate">{p.name}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Reset */}
                    <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-amber-800">Reset to Default Taguig Theme</p>
                        <p className="text-xs text-amber-600 mt-0.5">Restores the original City of Taguig color scheme</p>
                      </div>
                      <button onClick={resetTheme}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold rounded-lg transition-colors">
                        Reset to Default
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* ===== SERVE PATIENT MODAL — Diagnosis & Notes Required ===== */}
              {serveModalTarget && (
                <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.55)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999,padding:'16px'}}>
                  <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-gray-100" style={{background:'linear-gradient(to right,var(--ht-primary),var(--ht-accent))'}}>
                      <h2 className="text-lg font-bold text-white">Mark Patient as Served</h2>
                      <p className="text-sm text-white" style={{opacity:.85}}>Complete clinical notes before closing this queue entry</p>
                    </div>
                    {/* Patient Info */}
                    <div className="px-6 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0" style={{background:'var(--ht-primary)'}}>
                        {serveModalTarget.name?.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">{serveModalTarget.name}</p>
                        <p className="text-xs text-gray-500">{serveModalTarget.service} · {serveModalTarget.priority} Priority · Queue #{serveModalTarget.queueNumber}</p>
                      </div>
                      <div className="ml-auto text-right">
                        <p className="text-xs text-gray-400">Chief Complaint</p>
                        <p className="text-xs font-medium text-gray-700">{serveModalTarget.chiefComplaint || 'N/A'}</p>
                      </div>
                    </div>
                    {/* Form */}
                    <div className="px-6 py-5 space-y-4">
                      {serveError && (
                        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                          <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
                          <p className="text-sm text-red-700">{serveError}</p>
                        </div>
                      )}
                      {/* Diagnosis */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Diagnosis <span className="text-red-500">*</span></label>
                        {(() => {
                          const suggestions = {
                            'Maternal Care': ['Normal prenatal check-up','Postnatal recovery — normal','Safe motherhood counseling given','Referred for OB-GYN consultation'],
                            'Child Health Services': ['Healthy newborn — no abnormalities','Immunization completed','Normal growth and development','Underweight — referred for nutrition program'],
                            'Family Planning': ['Counseling provided — patient informed','Contraceptives dispensed','Natural family planning method discussed','Referred for further FP services'],
                            'Basic Medical Services': ['Fever — viral etiology, self-limiting','Upper respiratory tract infection (URTI)','Hypertension — monitored, medication adjusted','Minor laceration — treated and dressed','Diarrhea — mild, oral rehydration advised','Referred to hospital for advanced care'],
                            'Nutrition Programs': ['Nutritional counseling completed','Vitamin A supplementation given','Iron supplementation given','Undernutrition — referred for follow-up'],
                            'Communicable Disease Control': ['TB screening — negative','TB screening — referred for confirmatory test','Dengue monitoring — no symptoms','COVID-19 monitoring — asymptomatic','Rabies prevention info provided'],
                            'Health Education & Counseling': ['Hygiene education provided','Adolescent health counseling completed','Awareness session for diabetes/hypertension conducted'],
                            'Environmental Health & Sanitation Services': ['Water sanitation awareness provided','Waste disposal education completed','Community health surveillance conducted'],
                            'Senior Citizen Health Services': ['BP normal — continue maintenance medication','Hypertension — medication adjusted','Basic consultation completed — stable condition','Maintenance medicine dispensed'],
                            'Administrative & Health Records Services': ['Health records updated','Health referral document issued','Health certificate processed'],
                          };
                          const cat = serveModalTarget?.serviceCategory || '';
                          const opts = suggestions[cat] || [];
                          return opts.length > 0 ? (
                            <div className="space-y-1">
                              <select
                                onChange={e => { if(e.target.value) setServeForm({...serveForm, diagnosis: e.target.value}); }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:border-transparent bg-blue-50"
                                defaultValue=""
                              >
                                <option value="">💡 Quick select diagnosis...</option>
                                {opts.map(o => <option key={o} value={o}>{o}</option>)}
                              </select>
                              <textarea
                                value={serveForm.diagnosis}
                                onChange={e => setServeForm({...serveForm, diagnosis: e.target.value})}
                                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm resize-none focus:ring-2 focus:border-transparent"
                                rows={2} placeholder="Or type custom diagnosis..."
                              />
                            </div>
                          ) : (
                            <textarea
                              value={serveForm.diagnosis}
                              onChange={e => setServeForm({...serveForm, diagnosis: e.target.value})}
                              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm resize-none focus:ring-2 focus:border-transparent"
                              rows={2} placeholder="Enter diagnosis (required)"
                            />
                          );
                        })()}
                      </div>
                      {/* Treatment */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Treatment / Prescription</label>
                        {(() => {
                          const suggestions = {
                            'Maternal Care': ['Iron + folic acid supplementation','Postnatal vitamins prescribed','Referred to RHU/hospital','Tetanus toxoid given'],
                            'Child Health Services': ['Vaccines administered per EPI schedule','Vitamin A capsule given','ORS for rehydration','Referred to pediatrician'],
                            'Family Planning': ['OCP (oral contraceptive pills) dispensed','Condoms distributed','Injectable contraceptive administered','IUD insertion referral'],
                            'Basic Medical Services': ['Paracetamol 500mg — PRN for fever','Amoxicillin 500mg TID x 7 days','ORS for rehydration','Wound cleaned and dressed','Antihypertensive medication adjusted','Referred to hospital'],
                            'Nutrition Programs': ['Vitamin A 100,000 IU given','Ferrous sulfate supplementation','Nutritional meal plan advised','Referred to nutritionist'],
                            'Communicable Disease Control': ['Referred to DOTS center for TB treatment','Dengue home care instructions given','COVID-19 home isolation advised','Anti-rabies information given'],
                            'Health Education & Counseling': ['Educational materials distributed','Counseling session completed','Follow-up session scheduled'],
                            'Senior Citizen Health Services': ['Maintenance medication dispensed','BP medication adjusted','Follow-up in 1 week advised','Referred to physician'],
                            'Administrative & Health Records Services': ['Records updated in system','Referral slip issued','Health certificate released'],
                          };
                          const cat = serveModalTarget?.serviceCategory || '';
                          const opts = suggestions[cat] || [];
                          return opts.length > 0 ? (
                            <div className="space-y-1">
                              <select
                                onChange={e => { if(e.target.value) setServeForm({...serveForm, treatment: e.target.value}); }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:border-transparent bg-green-50"
                                defaultValue=""
                              >
                                <option value="">💊 Quick select treatment...</option>
                                {opts.map(o => <option key={o} value={o}>{o}</option>)}
                              </select>
                              <input
                                type="text"
                                value={serveForm.treatment}
                                onChange={e => setServeForm({...serveForm, treatment: e.target.value})}
                                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:border-transparent"
                                placeholder="Or type custom treatment..."
                              />
                            </div>
                          ) : (
                            <input
                              type="text"
                              value={serveForm.treatment}
                              onChange={e => setServeForm({...serveForm, treatment: e.target.value})}
                              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:border-transparent"
                              placeholder="Treatment given (optional)"
                            />
                          );
                        })()}
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Clinical Notes <span className="text-red-500">*</span></label>
                        <textarea
                          value={serveForm.notes}
                          onChange={e => setServeForm({...serveForm, notes: e.target.value})}
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm resize-none focus:ring-2 focus:border-transparent"
                          rows={3} placeholder="Enter clinical notes and observations (required)"
                        />
                      </div>
                      <p className="text-xs text-gray-400">Fields marked <span className="text-red-500">*</span> are required before marking as served.</p>
                    </div>
                    {/* Actions */}
                    <div className="px-6 py-4 border-t border-gray-100 flex gap-3 justify-end">
                      <button
                        onClick={() => { setServeModalTarget(null); setServeError(''); }}
                        className="px-5 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                      >Cancel</button>
                      <button
                        onClick={confirmServe}
                        className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
                        style={{background:'var(--ht-primary)'}}
                      >✓ Confirm Served & Save to Visit Log</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Edit Patient Modal */}
              {editingPatient && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                  <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                    <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
                      <h2 className="text-2xl font-bold text-gray-800">Edit Patient Information</h2>
                      <button
                        onClick={() => setEditingPatient(null)}
                        className="text-gray-500 hover:text-gray-700 text-2xl"
                      >
                        ×
                      </button>
                    </div>
                    <div className="p-6">
                      <div className="grid md:grid-cols-2 gap-4">
                        {/* Same fields as Register Patient, but populated with editingPatient data */}
                        <div className="md:col-span-2">
                          <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b">Personal Information</h3>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Last Name</label>
                          <input
                            type="text"
                            value={editingPatient.lastName}
                            onChange={(e) => setEditingPatient({...editingPatient, lastName: e.target.value})}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">First Name</label>
                          <input
                            type="text"
                            value={editingPatient.firstName}
                            onChange={(e) => setEditingPatient({...editingPatient, firstName: e.target.value})}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Middle Name</label>
                          <input
                            type="text"
                            value={editingPatient.middleName}
                            onChange={(e) => setEditingPatient({...editingPatient, middleName: e.target.value})}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Date of Birth</label>
                          <input
                            type="date"
                            value={editingPatient.dateOfBirth}
                            onChange={(e) => setEditingPatient({...editingPatient, dateOfBirth: e.target.value})}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Sex</label>
                          <select
                            value={editingPatient.sex}
                            onChange={(e) => setEditingPatient({...editingPatient, sex: e.target.value})}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Civil Status</label>
                          <select
                            value={editingPatient.civilStatus}
                            onChange={(e) => {
                              if (!validateCivilStatus(editingPatient.dateOfBirth, e.target.value)) {
                                alert('⚠️ Under RA 11596 (Prohibition of Child Marriage Act), the minimum age for marriage in the Philippines is 18 years old. Please select Single for patients under 18.');
                                return;
                              }
                              setEditingPatient({...editingPatient, civilStatus: e.target.value});
                            }}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="">Select</option>
                            <option value="Single">Single</option>
                            <option value="Married">Married</option>
                            <option value="Widowed">Widowed</option>
                            <option value="Separated">Separated</option>
                          </select>
                        </div>

                        <div className="md:col-span-2 mt-4">
                          <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b">Contact Information</h3>
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Address</label>
                          <input
                            type="text"
                            value={editingPatient.address}
                            onChange={(e) => setEditingPatient({...editingPatient, address: e.target.value})}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Contact Number</label>
                          <input
                            type="tel"
                            value={editingPatient.contact}
                            onChange={(e) => setEditingPatient({...editingPatient, contact: sanitizePhone(e.target.value)})}
                            placeholder="09XXXXXXXXX"
                            maxLength={16}
                            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${phoneClass(editingPatient.contact)}`}
                          />
                          <PhoneMsg val={editingPatient.contact} />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Occupation</label>
                          <input
                            type="text"
                            value={editingPatient.occupation}
                            onChange={(e) => setEditingPatient({...editingPatient, occupation: e.target.value})}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            PWD ID Number <span className="text-gray-400 font-normal">(optional)</span>
                          </label>
                          <input
                            type="text"
                            value={editingPatient.pwdId || ''}
                            onChange={(e) => setEditingPatient({...editingPatient, pwdId: e.target.value})}
                            placeholder="e.g. PWD-2024-XXXXX"
                            className="w-full px-4 py-2 border border-blue-200 bg-blue-50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          <p className="text-xs text-blue-600 mt-1">♿ Auto-sets Priority Case in queue</p>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Emergency Contact Person</label>
                          <input
                            type="text"
                            value={editingPatient.emergencyContactPerson}
                            onChange={(e) => setEditingPatient({...editingPatient, emergencyContactPerson: e.target.value})}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Emergency Contact Number</label>
                          <input
                            type="tel"
                            value={editingPatient.emergencyContactNumber}
                            onChange={(e) => setEditingPatient({...editingPatient, emergencyContactNumber: sanitizePhone(e.target.value).slice(0,12)})}
                            placeholder="09XXXXXXXXX or 8-digit landline" maxLength={12}
                            maxLength={16}
                            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${phoneClass(editingPatient.emergencyContactNumber)}`}
                          />
                          <PhoneMsg val={editingPatient.emergencyContactNumber} />
                        </div>

                        <div className="md:col-span-2 mt-4">
                          <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b">Medical Information</h3>
                        </div>

                        <div>
                          <div className="flex justify-between items-center mb-2"><label className="block text-sm font-semibold text-gray-700">Allergies</label><button type="button" onClick={() => setEditingPatient({...editingPatient, allergies: 'None'})} className="text-xs text-blue-500 hover:text-blue-700 font-medium">+ None</button></div>
                          <input
                            type="text"
                            value={editingPatient.allergies}
                            onChange={(e) => setEditingPatient({...editingPatient, allergies: e.target.value})}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <div className="flex justify-between items-center mb-2"><label className="block text-sm font-semibold text-gray-700">Chronic Conditions</label><button type="button" onClick={() => setEditingPatient({...editingPatient, chronicConditions: 'None'})} className="text-xs text-blue-500 hover:text-blue-700 font-medium">+ None</button></div>
                          <input
                            type="text"
                            value={editingPatient.chronicConditions}
                            onChange={(e) => setEditingPatient({...editingPatient, chronicConditions: e.target.value})}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <div className="flex justify-between items-center mb-2"><label className="block text-sm font-semibold text-gray-700">Current Medications</label><button type="button" onClick={() => setEditingPatient({...editingPatient, currentMedications: 'None'})} className="text-xs text-blue-500 hover:text-blue-700 font-medium">+ None</button></div>
                          <textarea
                            value={editingPatient.currentMedications}
                            onChange={(e) => setEditingPatient({...editingPatient, currentMedications: e.target.value})}
                            rows={3}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
                        <button
                          onClick={() => setEditingPatient(null)}
                          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={updatePatient}
                          className="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 font-semibold transition-all transform hover:scale-105"
                        >
                          Update Patient
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        }

        // ==================== RENDER APP ====================
        ReactDOM.render(<HealthTrackApp />, document.getElementById('root'));
