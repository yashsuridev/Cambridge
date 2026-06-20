// Subject Configurations
const SUBJECTS = ['english', 'hindi', 'mathematics', 'science', 'socialScience', 'computer', 'sanskrit'];

const SUBJECT_LABELS = {
    english: 'English',
    hindi: 'Hindi',
    mathematics: 'Mathematics',
    science: 'Science',
    socialScience: 'Social Science (SST)',
    computer: 'Computer',
    sanskrit: 'Sanskrit'
};

// Application State
let students = [];
let activeView = 'dashboard';
let subjectChart = null;

// No pre-loaded mock students — start with a clean slate
const MOCK_STUDENTS = [];

// ===================== AUTH LOGIC =====================

const VALID_USERNAME = 'Anita';
const VALID_PASSWORD = 'Anita2005';

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    loadTheme();
    loadStudents();
    setupFormCalculationListeners();

    // Check if already logged in (session persists on refresh)
    const isLoggedIn = sessionStorage.getItem('cambridge_logged_in') === 'true';
    if (isLoggedIn) {
        // Instantly hide login overlay without animation
        const overlay = document.getElementById('login-overlay');
        if (overlay) overlay.style.display = 'none';
        switchView('dashboard');
    }
    // If not logged in, login overlay is visible by default (CSS)
});

// Handle Login Form Submit
function handleLogin(event) {
    event.preventDefault();

    const usernameInput = document.getElementById('login-username');
    const passwordInput = document.getElementById('login-password');
    const errorEl      = document.getElementById('login-error');
    const submitBtn    = document.getElementById('login-submit-btn');

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    // Clear previous error
    errorEl.textContent = '';

    if (username === VALID_USERNAME && password === VALID_PASSWORD) {
        // Success — add loading state
        submitBtn.classList.add('loading');
        submitBtn.textContent = 'Signing in…';

        sessionStorage.setItem('cambridge_logged_in', 'true');

        setTimeout(() => {
            const overlay = document.getElementById('login-overlay');
            overlay.classList.add('hidden');

            // After fade-out animation, remove overlay
            setTimeout(() => {
                overlay.style.display = 'none';
                switchView('dashboard');
                showToast(`Welcome back, ${VALID_USERNAME}! 🎓`, 'success');
            }, 500);
        }, 600);
    } else {
        // Failure — shake the error
        errorEl.style.animation = 'none';
        requestAnimationFrame(() => {
            errorEl.style.animation = '';
            errorEl.textContent = '⚠️ Incorrect username or password. Please try again.';
        });
        passwordInput.value = '';
        passwordInput.focus();
    }
}

// Handle Logout
function handleLogout() {
    sessionStorage.removeItem('cambridge_logged_in');

    const overlay = document.getElementById('login-overlay');
    overlay.style.display = 'flex';
    overlay.style.opacity = '0';
    overlay.classList.remove('hidden');

    // Reset login form
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';
    document.getElementById('login-error').textContent = '';
    const submitBtn = document.getElementById('login-submit-btn');
    submitBtn.classList.remove('loading');
    submitBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M10 17v-3H3v-4h7V7l5 5-5 5zm9 2H12v2h7c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-7v2h7v14z"/></svg> Sign In';
    // Reset eye toggle
    const passInput = document.getElementById('login-password');
    passInput.type = 'password';
    document.getElementById('eye-show').style.display = '';
    document.getElementById('eye-hide').style.display = 'none';

    // Fade back in
    requestAnimationFrame(() => {
        overlay.style.transition = 'opacity 0.4s ease';
        overlay.style.opacity = '1';
    });

    showToast('You have been logged out.', 'info');
}

// Toggle Password Visibility
function togglePasswordVisibility() {
    const passInput = document.getElementById('login-password');
    const eyeShow   = document.getElementById('eye-show');
    const eyeHide   = document.getElementById('eye-hide');

    if (passInput.type === 'password') {
        passInput.type = 'text';
        eyeShow.style.display = 'none';
        eyeHide.style.display = 'block';
    } else {
        passInput.type = 'password';
        eyeShow.style.display = 'block';
        eyeHide.style.display = 'none';
    }
}

// Load Theme from LocalStorage
function loadTheme() {
    const savedTheme = localStorage.getItem('cambridge_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeUI(savedTheme);
}

// Toggle Theme (Light/Dark)
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('cambridge_theme', newTheme);
    updateThemeUI(newTheme);
    
    // Refresh charts if we are on the dashboard
    if (activeView === 'dashboard') {
        renderSubjectChart();
    }
    showToast(`Switched to ${newTheme === 'dark' ? 'Dark' : 'Light'} Mode`, 'info');
}

// Update Theme UI Elements
function updateThemeUI(theme) {
    const lightIcon = document.getElementById('theme-icon-light');
    const darkIcon = document.getElementById('theme-icon-dark');
    const themeText = document.getElementById('theme-text');
    
    if (theme === 'dark') {
        lightIcon.style.display = 'block';
        darkIcon.style.display = 'none';
        themeText.innerText = 'Light Mode';
    } else {
        lightIcon.style.display = 'none';
        darkIcon.style.display = 'block';
        themeText.innerText = 'Dark Mode';
    }
}

// Load Student Data
function loadStudents() {
    // Clean up any legacy 'apex_students' key from previous version
    localStorage.removeItem('apex_students');
    localStorage.removeItem('apex_theme');
    localStorage.removeItem('apex_logged_in');

    const stored = localStorage.getItem('cambridge_students');
    if (stored) {
        students = JSON.parse(stored);
    } else {
        students = [];
        localStorage.setItem('cambridge_students', JSON.stringify(students));
    }
}

// Switch Sidebar Views
function switchView(viewId) {
    activeView = viewId;
    
    // Manage section visibility
    document.querySelectorAll('.view-section').forEach(sec => {
        sec.classList.remove('active');
    });
    
    const targetSection = document.getElementById(`view-${viewId}`);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    // Manage sidebar item active state
    document.querySelectorAll('.nav-menu li').forEach(li => {
        li.classList.remove('active');
    });
    
    const navItem = document.getElementById(`nav-${viewId}`);
    if (navItem) {
        navItem.classList.add('active');
    } else if (viewId === 'form') {
        // If form, highlight add student nav item if we are adding, or none if editing
        const studentId = document.getElementById('student-id').value;
        if (!studentId) {
            document.getElementById('nav-add-student').classList.add('active');
        }
    }
    
    // Run view specific initializations
    if (viewId === 'dashboard') {
        updateDashboardMetrics();
        renderSubjectChart();
        renderTopPerformers();
    } else if (viewId === 'students') {
        filterStudents();
    }
}

// Math Calculations Helpers
// UT1+UT2 subtotal (max 20) and UT3+UT4 subtotal (max 20)
function getSubjectUT12Total(subjData) {
    return Number(subjData.ut1 || 0) + Number(subjData.ut2 || 0);
}
function getSubjectUT34Total(subjData) {
    return Number(subjData.ut3 || 0) + Number(subjData.ut4 || 0);
}
function getSubjectUTTotal(subjData) {
    return getSubjectUT12Total(subjData) + getSubjectUT34Total(subjData);
}

// Half Yearly Total = UT1 (10) + UT2 (10) + Half Yearly Exam (80) = Max 100
function getSubjectHalfYearlyTotal(subjData) {
    return getSubjectUT12Total(subjData) + Number(subjData.halfYearly || 0);
}

// Annual Total = UT3 (10) + UT4 (10) + Annual Exam (80) = Max 100
function getSubjectAnnualTotal(subjData) {
    return getSubjectUT34Total(subjData) + Number(subjData.annual || 0);
}

// Final = Half Yearly Total (100) + Annual Total (100) = Max 200
function getSubjectFinalMarks(subjData) {
    return getSubjectHalfYearlyTotal(subjData) + getSubjectAnnualTotal(subjData);
}

function getSubjectGrade(score) {
    const percentage = score / 2; // scaled to 100
    if (percentage >= 91) return 'A1';
    if (percentage >= 81) return 'A2';
    if (percentage >= 71) return 'B1';
    if (percentage >= 61) return 'B2';
    if (percentage >= 51) return 'C1';
    if (percentage >= 41) return 'C2';
    if (percentage >= 33) return 'D';
    return 'E'; // Fail
}

// Max per subject = (UT1 + UT2 + HY) + (UT3 + UT4 + Annual) = 100 + 100 = 200
const MAX_PER_SUBJECT = 200;

function calculateStudentTotal(student) {
    let grandTotal = 0;
    SUBJECTS.forEach(subj => {
        grandTotal += getSubjectFinalMarks(student.marks[subj]);
    });
    return grandTotal;
}

function calculateStudentPercentage(student) {
    const grandTotal = calculateStudentTotal(student);
    return (grandTotal / (SUBJECTS.length * MAX_PER_SUBJECT)) * 100;
}

function getStudentOverallGrade(percentage) {
    if (percentage >= 91) return 'A1';
    if (percentage >= 81) return 'A2';
    if (percentage >= 71) return 'B1';
    if (percentage >= 61) return 'B2';
    if (percentage >= 51) return 'C1';
    if (percentage >= 41) return 'C2';
    if (percentage >= 33) return 'D';
    return 'E';
}

function countPassedSubjects(student) {
    let passCount = 0;
    SUBJECTS.forEach(subj => {
        if (getSubjectFinalMarks(student.marks[subj]) >= 66) {
            passCount++;
        }
    });
    return passCount;
}

// Dashboard Statistics Updates
function updateDashboardMetrics() {
    const total = students.length;
    document.getElementById('metric-total-students').innerText = total;
    
    if (total === 0) {
        document.getElementById('metric-class-average').innerText = '0.0%';
        document.getElementById('metric-pass-rate').innerText = '0.0%';
        document.getElementById('metric-top-performer').innerText = 'N/A';
        document.getElementById('trend-top-score').innerText = 'Score: -';
        return;
    }
    
    // Class Average
    let sumPercentage = 0;
    let passCount = 0;
    let topPerformer = null;
    let topScore = -1;
    
    students.forEach(student => {
        const pct = calculateStudentPercentage(student);
        sumPercentage += pct;
        
        // Pass rate based on student percentage >= 33%
        if (pct >= 33) {
            passCount++;
        }
        
        if (pct > topScore) {
            topScore = pct;
            topPerformer = student;
        }
    });
    
    const avgPercentage = sumPercentage / total;
    const passRate = (passCount / total) * 100;
    
    document.getElementById('metric-class-average').innerText = `${avgPercentage.toFixed(1)}%`;
    document.getElementById('metric-pass-rate').innerText = `${passRate.toFixed(1)}%`;
    
    if (topPerformer) {
        document.getElementById('metric-top-performer').innerText = topPerformer.name;
        document.getElementById('trend-top-score').innerText = `Score: ${topScore.toFixed(1)}% (Roll: ${topPerformer.rollNo})`;
    }
}

// Render Top Performers List (Dashboard Sidebar)
function renderTopPerformers() {
    const listEl = document.getElementById('top-students-list');
    
    if (students.length === 0) {
        listEl.innerHTML = `
            <div class="empty-state" style="padding: 2rem 0;">
                <p>No student records found. Add students to view rankings.</p>
            </div>
        `;
        return;
    }
    
    // Sort students by percentage descending
    const sorted = [...students].sort((a, b) => calculateStudentPercentage(b) - calculateStudentPercentage(a));
    const top3 = sorted.slice(0, 3);
    
    let html = '';
    top3.forEach((student, index) => {
        const pct = calculateStudentPercentage(student);
        html += `
            <div class="ranking-item">
                <div class="ranking-info">
                    <span class="rank-badge">${index + 1}</span>
                    <span class="rank-name">${student.name}</span>
                </div>
                <span class="rank-score">${pct.toFixed(1)}%</span>
            </div>
        `;
    });
    
    listEl.innerHTML = html;
}

// Render Chart.js visual data comparison
function renderSubjectChart() {
    const ctx = document.getElementById('subjectComparisonChart').getContext('2d');
    
    // Destroy previous instance to avoid visual glitches
    if (subjectChart) {
        subjectChart.destroy();
    }
    
    if (students.length === 0) {
        // Clear canvas
        return;
    }
    
    // Calculate averages for each subject
    const subjectAverages = SUBJECTS.map(subj => {
        let sum = 0;
        students.forEach(st => {
            sum += getSubjectFinalMarks(st.marks[subj]);
        });
        return Number((sum / students.length).toFixed(1));
    });
    
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#94a3b8' : '#64748b';
    const gridColor = isDark ? '#334155' : '#e2e8f0';
    
    const labels = SUBJECTS.map(s => SUBJECT_LABELS[s]);
    
    subjectChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Class Average Score',
                data: subjectAverages,
                backgroundColor: 'rgba(59, 130, 246, 0.65)',
                borderColor: '#3b82f6',
                borderWidth: 2,
                borderRadius: 8,
                hoverBackgroundColor: 'rgba(37, 99, 235, 0.85)',
                hoverBorderColor: '#2563eb'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Average: ${context.raw} / 200`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    min: 0,
                    max: 200,
                    ticks: {
                        color: textColor,
                        font: { family: 'Outfit', size: 12 }
                    },
                    grid: {
                        color: gridColor
                    }
                },
                x: {
                    ticks: {
                        color: textColor,
                        font: { family: 'Outfit', size: 11 }
                    },
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// Student Directory Table Functions
function filterStudents() {
    const query = document.getElementById('search-bar').value.toLowerCase().trim();
    const resultFilter = document.getElementById('filter-result').value;
    const sortBy = document.getElementById('filter-sort').value;
    
    let filtered = students.filter(student => {
        const matchesQuery = student.name.toLowerCase().includes(query) || student.rollNo.includes(query);
        
        const pct = calculateStudentPercentage(student);
        const passed = pct >= 33;
        
        if (resultFilter === 'pass') {
            return matchesQuery && passed;
        } else if (resultFilter === 'fail') {
            return matchesQuery && !passed;
        }
        
        return matchesQuery;
    });
    
    // Apply Sorting
    filtered.sort((a, b) => {
        if (sortBy === 'name-asc') {
            return a.name.localeCompare(b.name);
        } else if (sortBy === 'name-desc') {
            return b.name.localeCompare(a.name);
        } else if (sortBy === 'roll-asc') {
            return Number(a.rollNo) - Number(b.rollNo);
        } else if (sortBy === 'score-desc') {
            return calculateStudentPercentage(b) - calculateStudentPercentage(a);
        } else if (sortBy === 'score-asc') {
            return calculateStudentPercentage(a) - calculateStudentPercentage(b);
        }
        return 0;
    });
    
    renderStudentTable(filtered);
}

function renderStudentTable(studentList) {
    const tbody = document.getElementById('student-table-body');
    
    if (studentList.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7">
                    <div class="empty-state">
                        <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
                        <h4>No Students Found</h4>
                        <p>Try adjusting your search filters or add a new student record.</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    studentList.forEach(st => {
        const grandTotal = calculateStudentTotal(st);
        const pct = calculateStudentPercentage(st);
        const passedCount = countPassedSubjects(st);
        const passedOverall = pct >= 33;
        
        html += `
            <tr>
                <td style="font-weight: 600;">${st.rollNo}</td>
                <td style="font-weight: 500;">${st.name}</td>
                <td>${passedCount} / ${SUBJECTS.length}</td>
                <td style="font-weight: 700; color: var(--primary);">${grandTotal.toFixed(1)} <span style="font-size: 0.75rem; color: var(--text-muted);">/${SUBJECTS.length * MAX_PER_SUBJECT}</span></td>
                <td style="font-weight: 600;">${pct.toFixed(1)}%</td>
                <td>
                    <span class="badge ${passedOverall ? 'badge-pass' : 'badge-fail'}">
                        ${passedOverall ? 'Passed' : 'Essential Repeat'}
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-icon" onclick="openReportCard('${st.id}')" title="View Report Card">
                            <!-- eye icon -->
                            <svg viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
                        </button>
                        <button class="btn-icon" onclick="editStudent('${st.id}')" title="Edit Scores">
                            <!-- edit icon -->
                            <svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a9.96 9.96 0 0 0 0-1.41l-2.34-2.34a9.96 9.96 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                        </button>
                        <button class="btn-icon delete" onclick="deleteStudent('${st.id}')" title="Delete Student">
                            <!-- trash icon -->
                            <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

// Setup Live Calculations inside Form
function setupFormCalculationListeners() {
    // Select all inputs inside subjects-scores-container and monitor input changes
    document.querySelectorAll('.subject-row-grid input').forEach(input => {
        input.addEventListener('input', () => {
            const row = input.closest('.subject-row-grid');
            if (row) {
                const ut1Val = row.querySelector('.ut1-input').value;
                const ut2Val = row.querySelector('.ut2-input').value;
                const ut3Val = row.querySelector('.ut3-input').value;
                const ut4Val = row.querySelector('.ut4-input').value;
                const hyVal  = row.querySelector('.hy-input').value;
                const annVal = row.querySelector('.ann-input').value;

                const totalCell = row.querySelector('.total-cell');
                if (totalCell) {
                    if (ut1Val === '' && ut2Val === '' && ut3Val === '' && ut4Val === '' && hyVal === '' && annVal === '') {
                        totalCell.innerText = '0';
                        totalCell.style.color = 'var(--primary)';
                        totalCell.style.backgroundColor = 'var(--primary-light)';
                        return;
                    }

                    const ut1 = Number(ut1Val) || 0;
                    const ut2 = Number(ut2Val) || 0;
                    const ut3 = Number(ut3Val) || 0;
                    const ut4 = Number(ut4Val) || 0;
                    const hy  = Number(hyVal)  || 0;
                    const ann = Number(annVal)  || 0;

                    const final = ut1 + ut2 + ut3 + ut4 + hy + ann;

                    totalCell.innerText = final.toFixed(1);
                    // Color code dynamically based on passing mark 66 (33% of 200)
                    if (final < 66) {
                        totalCell.style.color = 'var(--danger)';
                        totalCell.style.backgroundColor = 'var(--danger-light)';
                    } else {
                        totalCell.style.color = 'var(--success)';
                        totalCell.style.backgroundColor = 'var(--success-light)';
                    }
                }
            }
        });
    });
}

function calcSubjectTotal(input) {
    // Redundant helper just in case inline call is triggered, setupFormCalculationListeners covers it
}

// Add student click handlers
function openAddStudentForm() {
    document.getElementById('form-title').innerText = 'Add New Student';
    document.getElementById('form-save-btn').innerText = 'Save Student';
    document.getElementById('student-id').value = '';
    
    // Clear inputs
    document.getElementById('student-name').value = '';
    document.getElementById('student-roll').value = '';
    
    document.querySelectorAll('.subject-row-grid').forEach(row => {
        const ut1 = row.querySelector('.ut1-input');
        const ut2 = row.querySelector('.ut2-input');
        const ut3 = row.querySelector('.ut3-input');
        const ut4 = row.querySelector('.ut4-input');
        const hy  = row.querySelector('.hy-input');
        const ann = row.querySelector('.ann-input');
        const total = row.querySelector('.total-cell');

        if (ut1) ut1.value = '';
        if (ut2) ut2.value = '';
        if (ut3) ut3.value = '';
        if (ut4) ut4.value = '';
        if (hy)  hy.value  = '';
        if (ann) ann.value = '';
        if (total) {
            total.innerText = '0';
            total.style.color = 'var(--primary)';
            total.style.backgroundColor = 'var(--primary-light)';
        }
    });
    
    switchView('form');
}

// Edit student scores
function editStudent(id) {
    const student = students.find(s => s.id === id);
    if (!student) return;
    
    document.getElementById('form-title').innerText = 'Edit Student Marks';
    document.getElementById('form-save-btn').innerText = 'Update Record';
    document.getElementById('student-id').value = student.id;
    document.getElementById('student-name').value = student.name;
    document.getElementById('student-roll').value = student.rollNo;
    
    SUBJECTS.forEach(subj => {
        const row = document.querySelector(`.subject-row-grid[data-subject="${subj}"]`);
        if (row) {
            const ut1Val = student.marks[subj].ut1;
            const ut2Val = student.marks[subj].ut2;
            const ut3Val = student.marks[subj].ut3;
            const ut4Val = student.marks[subj].ut4;
            const hyVal  = student.marks[subj].halfYearly;
            const annVal = student.marks[subj].annual;

            row.querySelector('.ut1-input').value = ut1Val !== null ? ut1Val : '';
            row.querySelector('.ut2-input').value = ut2Val !== null ? ut2Val : '';
            row.querySelector('.ut3-input').value = ut3Val !== null ? ut3Val : '';
            row.querySelector('.ut4-input').value = ut4Val !== null ? ut4Val : '';
            row.querySelector('.hy-input').value  = hyVal  !== null ? hyVal  : '';
            row.querySelector('.ann-input').value = annVal !== null ? annVal : '';

            const totalCell = row.querySelector('.total-cell');
            if (totalCell) {
                const allNull = ut1Val === null && ut2Val === null && ut3Val === null && ut4Val === null && hyVal === null && annVal === null;
                if (allNull) {
                    totalCell.innerText = '0';
                    totalCell.style.color = 'var(--primary)';
                    totalCell.style.backgroundColor = 'var(--primary-light)';
                } else {
                    const final = Number(ut1Val || 0) + Number(ut2Val || 0) + Number(ut3Val || 0) + Number(ut4Val || 0) + Number(hyVal || 0) + Number(annVal || 0);
                    totalCell.innerText = final.toFixed(1);
                    if (final < 66) {
                        totalCell.style.color = 'var(--danger)';
                        totalCell.style.backgroundColor = 'var(--danger-light)';
                    } else {
                        totalCell.style.color = 'var(--success)';
                        totalCell.style.backgroundColor = 'var(--success-light)';
                    }
                }
            }
        }
    });
    
    switchView('form');
}

// Save Student handler
function saveStudent(event) {
    event.preventDefault();
    
    const id = document.getElementById('student-id').value;
    const name = document.getElementById('student-name').value.trim();
    const rollNo = document.getElementById('student-roll').value.trim();
    
    // Check if roll number already exists (for other students)
    const rollConflict = students.find(s => s.rollNo === rollNo && s.id !== id);
    if (rollConflict) {
        showToast(`Roll Number ${rollNo} is already registered to ${rollConflict.name}`, 'danger');
        return;
    }
    
    // Collect Marks
    const marks = {};
    let validationFailed = false;
    
    SUBJECTS.forEach(subj => {
        const row = document.querySelector(`.subject-row-grid[data-subject="${subj}"]`);
        if (row) {
            const ut1Val  = row.querySelector('.ut1-input').value;
            const ut2Val  = row.querySelector('.ut2-input').value;
            const ut3Val  = row.querySelector('.ut3-input').value;
            const ut4Val  = row.querySelector('.ut4-input').value;
            const hyVal   = row.querySelector('.hy-input').value;
            const annVal  = row.querySelector('.ann-input').value;

            const ut1       = ut1Val  === '' ? null : Number(ut1Val);
            const ut2       = ut2Val  === '' ? null : Number(ut2Val);
            const ut3       = ut3Val  === '' ? null : Number(ut3Val);
            const ut4       = ut4Val  === '' ? null : Number(ut4Val);
            const halfYearly = hyVal  === '' ? null : Number(hyVal);
            const annual    = annVal  === '' ? null : Number(annVal);

            if ((ut1 !== null && (ut1 < 0 || ut1 > 10)) ||
                (ut2 !== null && (ut2 < 0 || ut2 > 10)) ||
                (ut3 !== null && (ut3 < 0 || ut3 > 10)) ||
                (ut4 !== null && (ut4 < 0 || ut4 > 10)) ||
                (halfYearly !== null && (halfYearly < 0 || halfYearly > 80)) ||
                (annual     !== null && (annual     < 0 || annual     > 80))) {
                validationFailed = true;
            }

            marks[subj] = { ut1, ut2, ut3, ut4, halfYearly, annual };
        }
    });

    if (validationFailed) {
        showToast('Validation failed. Marks out of range: UT1-UT4 (0-10 each), Half Yearly (0-80), Annual (0-80).', 'danger');
        return;
    }
    
    if (id) {
        // Edit mode
        const index = students.findIndex(s => s.id === id);
        if (index !== -1) {
            students[index] = { id, name, rollNo, marks };
            showToast("Student marks updated successfully!", "success");
        }
    } else {
        // Add mode
        const newStudent = {
            id: 'st-' + Date.now(),
            name,
            rollNo,
            marks
        };
        students.push(newStudent);
        showToast("New student record created!", "success");
    }
    
    // Save to LocalStorage & Refresh
    localStorage.setItem('cambridge_students', JSON.stringify(students));
    switchView('students');
}

// Delete student records
function deleteStudent(id) {
    const student = students.find(s => s.id === id);
    if (!student) return;
    
    if (confirm(`Are you sure you want to delete ${student.name}'s result record?`)) {
        students = students.filter(s => s.id !== id);
        localStorage.setItem('cambridge_students', JSON.stringify(students));
        showToast("Student record deleted.", "warning");
        
        // Refresh Current View
        if (activeView === 'dashboard') {
            updateDashboardMetrics();
            renderSubjectChart();
            renderTopPerformers();
        } else if (activeView === 'students') {
            filterStudents();
        }
    }
}

// Report Card View Populate & Open
function openReportCard(studentId) {
    const student = students.find(s => s.id === studentId);
    if (!student) return;
    
    // Fill profile fields
    document.getElementById('rc-student-name').innerText = student.name;
    document.getElementById('rc-roll-no').innerText = student.rollNo;
    
    // Load subjects rows
    const tbody = document.getElementById('rc-marks-table-body');
    let rowsHtml = '';
    let halfYearlyGrand = 0;
    let annualGrand = 0;
    let grandFinalScore = 0;
    
    SUBJECTS.forEach(subj => {
        const sData  = student.marks[subj];
        const ut1    = sData.ut1  !== null ? sData.ut1  : '-';
        const ut2    = sData.ut2  !== null ? sData.ut2  : '-';
        const ut3    = sData.ut3  !== null ? sData.ut3  : '-';
        const ut4    = sData.ut4  !== null ? sData.ut4  : '-';
        
        const hy     = sData.halfYearly !== null ? sData.halfYearly : '-';
        const ann    = sData.annual     !== null ? sData.annual     : '-';
        
        const hyTotal = (sData.ut1 !== null || sData.ut2 !== null || sData.halfYearly !== null) ? getSubjectHalfYearlyTotal(sData) : 0;
        const annTotal = (sData.ut3 !== null || sData.ut4 !== null || sData.annual !== null) ? getSubjectAnnualTotal(sData) : 0;
        const final  = getSubjectFinalMarks(sData);

        const isSubjectAllNull = sData.ut1 === null && sData.ut2 === null && sData.ut3 === null && sData.ut4 === null && sData.halfYearly === null && sData.annual === null;
        const grade = isSubjectAllNull ? '-' : getSubjectGrade(final);

        halfYearlyGrand += hyTotal;
        annualGrand += annTotal;
        grandFinalScore += final;

        // Highlight failed marks in print styling (< 66 is fail out of 200, i.e., < 33%)
        const isSubjFailed = !isSubjectAllNull && final < 66;
        const scoreStyle = isSubjFailed ? 'color: var(--danger); font-weight: 700;' : '';
        const gradeStyle = isSubjFailed ? 'color: var(--danger); font-weight: 700;' : 'font-weight: 600; color: var(--primary);';

        const finalScoreText = isSubjectAllNull ? '-' : final.toFixed(1);
        const hyTotalText = (sData.ut1 === null && sData.ut2 === null && sData.halfYearly === null) ? '-' : hyTotal.toFixed(1);
        const annTotalText = (sData.ut3 === null && sData.ut4 === null && sData.annual === null) ? '-' : annTotal.toFixed(1);

        rowsHtml += `
            <tr>
                <td class="subject-name">${SUBJECT_LABELS[subj]}</td>
                <td>${ut1}</td>
                <td>${ut2}</td>
                <td>${hy}</td>
                <td style="font-weight:500">${hyTotalText}</td>
                <td>${ut3}</td>
                <td>${ut4}</td>
                <td>${ann}</td>
                <td style="font-weight:500">${annTotalText}</td>
                <td style="${scoreStyle}">${finalScoreText}</td>
                <td style="${gradeStyle}">${grade}</td>
            </tr>
        `;
    });
    
    // Total Row
    const maxTotal = SUBJECTS.length * MAX_PER_SUBJECT;
    const maxHalfYearly = SUBJECTS.length * 100;
    const maxAnnual = SUBJECTS.length * 100;
    
    const grandPercentage = (grandFinalScore / maxTotal) * 100;
    const halfYearlyPercentage = (halfYearlyGrand / maxHalfYearly) * 100;
    const annualPercentage = (annualGrand / maxAnnual) * 100;
    
    const passedAll = grandPercentage >= 33;
    const overallGrade = getStudentOverallGrade(grandPercentage);

    rowsHtml += `
        <tr class="total-row">
            <td class="subject-name">GRAND TOTAL</td>
            <td>-</td>
            <td>-</td>
            <td>-</td>
            <td>${halfYearlyGrand.toFixed(1)}</td>
            <td>-</td>
            <td>-</td>
            <td>-</td>
            <td>${annualGrand.toFixed(1)}</td>
            <td>${grandFinalScore.toFixed(1)} / ${maxTotal}</td>
            <td>${overallGrade}</td>
        </tr>
    `;

    tbody.innerHTML = rowsHtml;

    // Summary values
    document.getElementById('rc-hy-total').innerText = `${halfYearlyGrand.toFixed(1)} / ${maxHalfYearly}`;
    document.getElementById('rc-hy-percentage').innerText = `${halfYearlyPercentage.toFixed(1)}%`;
    document.getElementById('rc-ann-total').innerText = `${annualGrand.toFixed(1)} / ${maxAnnual}`;
    document.getElementById('rc-ann-percentage').innerText = `${annualPercentage.toFixed(1)}%`;
    document.getElementById('rc-grand-total').innerText = `${grandFinalScore.toFixed(1)} / ${maxTotal}`;
    document.getElementById('rc-percentage').innerText = `${grandPercentage.toFixed(1)}%`;
    
    const statusEl = document.getElementById('rc-status');
    statusEl.innerText = passedAll ? 'PASSED (Promoted)' : 'ESSENTIAL REPEAT (Failed)';
    statusEl.style.color = passedAll ? 'var(--success)' : 'var(--danger)';
    
    document.getElementById('rc-grade').innerText = overallGrade;
    
    // Dynamic Remarks Generation
    let remarks = '';
    
    // Find highest and lowest scoring subjects
    let highestSubj = '';
    let highestScore = -1;
    let lowestSubj = '';
    let lowestScore = 201; // out of 200
    
    SUBJECTS.forEach(subj => {
        const final = getSubjectFinalMarks(student.marks[subj]);
        if (final > highestScore) {
            highestScore = final;
            highestSubj = SUBJECT_LABELS[subj];
        }
        if (final < lowestScore) {
            lowestScore = final;
            lowestSubj = SUBJECT_LABELS[subj];
        }
    });
    
    if (grandPercentage >= 90) {
        remarks = `"Exceptional academic standing. Displays a brilliant attitude towards learning and exceptional analytical capability. Outstanding in ${highestSubj}."`;
    } else if (grandPercentage >= 75) {
        remarks = `"Very good performance. Attentive and takes active interest in classes. Excellent skills shown in ${highestSubj}."`;
    } else if (grandPercentage >= 55) {
        remarks = `"Satisfactory score. Possesses capability to improve; regular practice in ${lowestSubj} is highly recommended."`;
    } else if (grandPercentage >= 33) {
        remarks = `"Passed. Needs to pay closer attention to study schedules and seek help in key topics of ${lowestSubj}."`;
    } else {
        remarks = `"Needs intensive coaching. Consistent effort and parental guidance needed, especially in ${lowestSubj}."`;
    }
    
    document.getElementById('rc-remarks').innerText = remarks;
    
    // Show Modal
    document.getElementById('report-modal').classList.add('active');
}

function closeReportCard() {
    document.getElementById('report-modal').classList.remove('active');
}

// Print Handler
function printReportCard() {
    window.print();
}

// Toast System
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-el-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    // SVG icons based on type
    let iconSvg = '';
    if (type === 'success') {
        iconSvg = `<svg viewBox="0 0 24 24" width="20" height="20" fill="var(--success)"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>`;
    } else if (type === 'danger') {
        iconSvg = `<svg viewBox="0 0 24 24" width="20" height="20" fill="var(--danger)"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>`;
    } else if (type === 'warning') {
        iconSvg = `<svg viewBox="0 0 24 24" width="20" height="20" fill="var(--warning)"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>`;
    } else {
        iconSvg = `<svg viewBox="0 0 24 24" width="20" height="20" fill="var(--primary)"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>`;
    }
    
    toast.innerHTML = `${iconSvg} <span>${message}</span>`;
    container.appendChild(toast);
    
    // Slide out after 3.5s
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse forwards';
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3500);
}
