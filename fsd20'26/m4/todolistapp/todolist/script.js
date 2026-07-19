
    (function() {
        'use strict';

        // Application State
        let todos = [];
        let dones = [];
        let currentFilter = 'all';
        let editingId = null;
        let doneExpanded = true;
        let confirmCallback = null;

        // DOM References
        const taskForm       = document.getElementById('taskForm');
        const nameInput      = document.getElementById('nameInput');
        const jobInput       = document.getElementById('jobInput');
        const taskInput      = document.getElementById('taskInput');
        const priorityInput  = document.getElementById('priorityInput');
        const dueDateInput   = document.getElementById('dueDateInput');
        const todoListEl     = document.getElementById('todoList');
        const doneListEl     = document.getElementById('doneList');
        const todoEmpty      = document.getElementById('todoEmpty');
        const doneEmpty      = document.getElementById('doneEmpty');
        const editModal      = document.getElementById('editModal');
        const editForm       = document.getElementById('editForm');
        const confirmModal   = document.getElementById('confirmModal');
        const toastContainer = document.getElementById('toastContainer');
        const deleteAllBtn   = document.getElementById('deleteAllBtn');
        const clearDoneBtn   = document.getElementById('clearDoneBtn');
        const doneToggle     = document.getElementById('doneToggle');
        const doneToggleIcon = document.getElementById('doneToggleIcon');
        const doneListWrap   = document.getElementById('doneList');

        // Edit form fields
        const editName     = document.getElementById('editName');
        const editJob      = document.getElementById('editJob');
        const editTask     = document.getElementById('editTask');
        const editPriority = document.getElementById('editPriority');
        const editDueDate  = document.getElementById('editDueDate');

        // Local Storage
        const STORAGE_KEYS = { todos: 'taskforge_todos', dones: 'taskforge_dones' };

        function saveToStorage() {
            try {
                localStorage.setItem(STORAGE_KEYS.todos, JSON.stringify(todos));
                localStorage.setItem(STORAGE_KEYS.dones, JSON.stringify(dones));
            } catch (e) {
                showToast('Storage full or unavailable', 'error');
            }
        }

        function loadFromStorage() {
            try {
                const t = localStorage.getItem(STORAGE_KEYS.todos);
                const d = localStorage.getItem(STORAGE_KEYS.dones);
                if (t) todos = JSON.parse(t);
                if (d) dones = JSON.parse(d);
            } catch (e) {
                todos = [];
                dones = [];
            }
        }

        // Utility Functions
        function generateId() {
            return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
        }

        function escapeHtml(str) {
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        }

        function formatTimestamp(isoString) {
            if (!isoString) return '';
            const d = new Date(isoString);
            if (isNaN(d.getTime())) return '';
            const weekday  = d.toLocaleDateString('en-US', { weekday: 'long' });
            const datePart = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
            const timePart = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
            return weekday + ', ' + datePart + ' \u2014 ' + timePart;
        }

        function formatDueDate(isoString) {
            if (!isoString) return '';
            const d = new Date(isoString);
            if (isNaN(d.getTime())) return '';
            const datePart = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            const timePart = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
            return datePart + ' \u00B7 ' + timePart;
        }

        function isOverdue(task) {
            if (!task.dueDate) return false;
            return new Date(task.dueDate) < new Date();
        }

        function isDueToday(task) {
            if (!task.dueDate) return false;
            const due = new Date(task.dueDate);
            const now = new Date();
            return due.toDateString() === now.toDateString();
        }

        function getFilteredTodos() {
            switch (currentFilter) {
                case 'overdue': return todos.filter(function(t) { return isOverdue(t); });
                case 'high':    return todos.filter(function(t) { return t.priority === 'high'; });
                case 'today':   return todos.filter(function(t) { return isDueToday(t) && !isOverdue(t); });
                default:        return todos.slice();
            }
        }

        // Toast Notifications
        function showToast(message, type) {
            type = type || 'info';
            var iconMap = {
                success: 'fa-circle-check',
                error:   'fa-circle-xmark',
                info:    'fa-circle-info'
            };
            var toast = document.createElement('div');
            toast.className = 'toast ' + type;
            toast.innerHTML = '<i class="fa-solid ' + iconMap[type] + '"></i> ' + escapeHtml(message);
            toastContainer.appendChild(toast);

            setTimeout(function() {
                toast.classList.add('removing');
                setTimeout(function() { toast.remove(); }, 300);
            }, 3000);
        }

        // Confirm Dialog
        function showConfirm(title, message, callback) {
            document.getElementById('confirmTitle').textContent = title;
            document.getElementById('confirmMessage').textContent = message;
            confirmCallback = callback;
            confirmModal.classList.add('active');
            document.getElementById('confirmOk').focus();
        }

        function hideConfirm() {
            confirmModal.classList.remove('active');
            confirmCallback = null;
        }

        document.getElementById('confirmCancel').addEventListener('click', hideConfirm);
        document.getElementById('confirmOk').addEventListener('click', function() {
            if (confirmCallback) confirmCallback();
            hideConfirm();
        });
        confirmModal.addEventListener('click', function(e) {
            if (e.target === confirmModal) hideConfirm();
        });

        // Count Updates
        function updateCounts() {
            var pendingCount = todos.length;
            var doneCount    = dones.length;
            var overdueCount = todos.filter(isOverdue).length;
            var highCount    = todos.filter(function(t) { return t.priority === 'high'; }).length;
            var todayCount   = todos.filter(function(t) { return isDueToday(t) && !isOverdue(t); }).length;

            document.getElementById('statPending').textContent = pendingCount;
            document.getElementById('statDone').textContent    = doneCount;
            document.getElementById('statOverdue').textContent = overdueCount;

            document.getElementById('allCount').textContent     = pendingCount;
            document.getElementById('overdueCount').textContent  = overdueCount;
            document.getElementById('highCount').textContent     = highCount;
            document.getElementById('todayCount').textContent    = todayCount;

            // Todo count label (reflects current filter)
            var filtered = getFilteredTodos();
            document.getElementById('todoCountLabel').textContent = filtered.length + ' task' + (filtered.length !== 1 ? 's' : '');
            document.getElementById('doneCountLabel').textContent = doneCount + ' task' + (doneCount !== 1 ? 's' : '');
        }

        // Render Todo List
        function renderTodos() {
            var filtered = getFilteredTodos();
            todoListEl.innerHTML = '';

            if (filtered.length === 0) {
                todoEmpty.style.display = 'flex';
                var msg = todoEmpty.querySelector('p');
                switch (currentFilter) {
                    case 'overdue': msg.textContent = 'No overdue tasks. Well done!'; break;
                    case 'high':    msg.textContent = 'No high priority tasks.'; break;
                    case 'today':   msg.textContent = 'No tasks due today.'; break;
                    default:        msg.textContent = 'No tasks yet. Add one above to get started.'; break;
                }
            } else {
                todoEmpty.style.display = 'none';
                filtered.forEach(function(task) {
                    todoListEl.appendChild(createTodoCard(task));
                });
            }
            updateCounts();
        }

        function createTodoCard(task) {
            var card = document.createElement('div');
            card.className = 'task-card priority-' + task.priority;
            card.dataset.id = task.id;
            card.setAttribute('role', 'listitem');

            if (isOverdue(task)) card.classList.add('overdue');

            var overdueBadge = isOverdue(task)
                ? '<span class="badge badge-danger"><i class="fa-solid fa-clock"></i> Overdue</span>'
                : '';

            var dueDateHtml = task.dueDate
                ? '<div class="due-date ' + (isOverdue(task) ? 'text-danger' : '') + '">' +
                  '<i class="fa-regular fa-calendar"></i> Due: ' + formatDueDate(task.dueDate) + '</div>'
                : '';

            card.innerHTML =
                '<div class="task-main">' +
                    '<button class="checkbox-btn" data-action="complete" data-id="' + task.id + '" aria-label="Mark task as complete" title="Complete task">' +
                        '<i class="fa-regular fa-circle"></i>' +
                    '</button>' +
                    '<div class="task-content">' +
                        '<div class="task-meta">' +
                            '<span class="task-name">' + escapeHtml(task.name) + '</span>' +
                            '<span class="task-job">' + escapeHtml(task.jobTitle) + '</span>' +
                            '<span class="badge badge-' + task.priority + '">' + capitalize(task.priority) + '</span>' +
                            overdueBadge +
                        '</div>' +
                        '<p class="task-text">' + escapeHtml(task.task) + '</p>' +
                        '<div class="task-timestamp">' +
                            '<i class="fa-regular fa-clock"></i> ' + formatTimestamp(task.createdAt) +
                        '</div>' +
                        dueDateHtml +
                    '</div>' +
                '</div>' +
                '<div class="task-actions">' +
                    '<button class="btn-action btn-edit" data-action="edit" data-id="' + task.id + '" title="Edit task">' +
                        '<i class="fa-solid fa-pen-to-square"></i> <span>Edit</span>' +
                    '</button>' +
                    '<button class="btn-action btn-delete" data-action="delete" data-id="' + task.id + '" title="Delete task">' +
                        '<i class="fa-solid fa-trash"></i> <span>Delete</span>' +
                    '</button>' +
                '</div>';

            return card;
        }

        // Render Done List
        function renderDones() {
            doneListEl.innerHTML = '';

            if (dones.length === 0) {
                doneEmpty.style.display = 'flex';
            } else {
                doneEmpty.style.display = 'none';
                dones.forEach(function(task) {
                    doneListEl.appendChild(createDoneCard(task));
                });
            }
            updateCounts();
        }

        function createDoneCard(task) {
            var card = document.createElement('div');
            card.className = 'task-card done priority-' + task.priority;
            card.dataset.id = task.id;
            card.setAttribute('role', 'listitem');

            card.innerHTML =
                '<div class="task-main">' +
                    '<div class="checkbox-btn checked" aria-label="Task completed">' +
                        '<i class="fa-solid fa-circle-check"></i>' +
                    '</div>' +
                    '<div class="task-content">' +
                        '<div class="task-meta">' +
                            '<span class="task-name">' + escapeHtml(task.name) + '</span>' +
                            '<span class="task-job">' + escapeHtml(task.jobTitle) + '</span>' +
                            '<span class="badge badge-' + task.priority + '">' + capitalize(task.priority) + '</span>' +
                        '</div>' +
                        '<p class="task-text strikethrough">' + escapeHtml(task.task) + '</p>' +
                        '<div class="task-timestamp">' +
                            '<i class="fa-regular fa-clock"></i> ' + formatTimestamp(task.createdAt) +
                            '<span class="completed-at"> \u00B7 Completed ' + formatTimestamp(task.completedAt) + '</span>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
                '<div class="task-actions">' +
                    '<button class="btn-action btn-restore" data-action="restore" data-id="' + task.id + '" title="Restore task">' +
                        '<i class="fa-solid fa-rotate-left"></i> <span>Restore</span>' +
                    '</button>' +
                    '<button class="btn-action btn-delete" data-action="delete-done" data-id="' + task.id + '" title="Delete permanently">' +
                        '<i class="fa-solid fa-trash"></i> <span>Delete</span>' +
                    '</button>' +
                '</div>';

            return card;
        }

        function capitalize(str) {
            return str.charAt(0).toUpperCase() + str.slice(1);
        }

        // Form Validation
        function validateField(input, errorId) {
            var errorEl = document.getElementById(errorId);
            if (!input.value.trim()) {
                input.classList.add('error');
                errorEl.classList.add('visible');
                return false;
            } else {
                input.classList.remove('error');
                errorEl.classList.remove('visible');
                return true;
            }
        }

        // Clear error on input
        ['nameInput', 'jobInput', 'taskInput'].forEach(function(id) {
            var el = document.getElementById(id);
            el.addEventListener('input', function() {
                el.classList.remove('error');
                document.getElementById(id.replace('Input', 'Error')).classList.remove('visible');
            });
        });

        // Same for edit form
        ['editName', 'editJob', 'editTask'].forEach(function(id) {
            var el = document.getElementById(id);
            el.addEventListener('input', function() {
                el.classList.remove('error');
                document.getElementById(id + 'Error').classList.remove('visible');
            });
        });

        // Add Task
        taskForm.addEventListener('submit', function(e) {
            e.preventDefault();

            var valid = true;
            valid = validateField(nameInput, 'nameError') && valid;
            valid = validateField(jobInput, 'jobError') && valid;
            valid = validateField(taskInput, 'taskError') && valid;

            if (!valid) {
                showToast('Please fill in all required fields', 'error');
                return;
            }

            var newTask = {
                id: generateId(),
                name: nameInput.value.trim(),
                jobTitle: jobInput.value.trim(),
                task: taskInput.value.trim(),
                priority: priorityInput.value,
                dueDate: dueDateInput.value || null,
                createdAt: new Date().toISOString(),
                completedAt: null
            };

            todos.unshift(newTask);
            saveToStorage();
            renderTodos();

            // Reset form
            taskForm.reset();
            priorityInput.value = 'medium';

            showToast('Task added successfully', 'success');
        });

        // Event Delegation for Lists
        document.addEventListener('click', function(e) {
            var btn = e.target.closest('[data-action]');
            if (!btn) return;

            var action = btn.dataset.action;
            var id = btn.dataset.id;

            switch (action) {
                case 'complete':
                    completeTask(id, btn.closest('.task-card'));
                    break;
                case 'edit':
                    openEditModal(id);
                    break;
                case 'delete':
                    deleteTask(id, btn.closest('.task-card'));
                    break;
                case 'restore':
                    restoreTask(id, btn.closest('.task-card'));
                    break;
                case 'delete-done':
                    deleteDone(id, btn.closest('.task-card'));
                    break;
            }
        });

        // Complete Task
        function completeTask(id, cardEl) {
            var idx = todos.findIndex(function(t) { return t.id === id; });
            if (idx === -1) return;

            var task = todos[idx];

            // Animate out
            if (cardEl) {
                cardEl.classList.add('removing');
                setTimeout(function() {
                    // Strike through before moving
                    task.completedAt = new Date().toISOString();
                    dones.unshift(task);
                    todos.splice(idx, 1);
                    saveToStorage();
                    renderTodos();
                    renderDones();
                    showToast('Task marked as complete', 'success');
                }, 300);
            } else {
                task.completedAt = new Date().toISOString();
                dones.unshift(task);
                todos.splice(idx, 1);
                saveToStorage();
                renderTodos();
                renderDones();
                showToast('Task marked as complete', 'success');
            }
        }

        // Delete Task (from todo)
        function deleteTask(id, cardEl) {
            if (cardEl) {
                cardEl.classList.add('removing');
                setTimeout(function() {
                    todos = todos.filter(function(t) { return t.id !== id; });
                    saveToStorage();
                    renderTodos();
                    showToast('Task deleted', 'info');
                }, 300);
            } else {
                todos = todos.filter(function(t) { return t.id !== id; });
                saveToStorage();
                renderTodos();
                showToast('Task deleted', 'info');
            }
        }

        // Delete Done Task
        function deleteDone(id, cardEl) {
            if (cardEl) {
                cardEl.classList.add('removing');
                setTimeout(function() {
                    dones = dones.filter(function(t) { return t.id !== id; });
                    saveToStorage();
                    renderDones();
                    showToast('Task removed', 'info');
                }, 300);
            } else {
                dones = dones.filter(function(t) { return t.id !== id; });
                saveToStorage();
                renderDones();
                showToast('Task removed', 'info');
            }
        }

        // Restore Task
        function restoreTask(id, cardEl) {
            var idx = dones.findIndex(function(t) { return t.id === id; });
            if (idx === -1) return;

            var task = dones[idx];
            task.completedAt = null;

            if (cardEl) {
                cardEl.classList.add('removing');
                setTimeout(function() {
                    todos.unshift(task);
                    dones.splice(idx, 1);
                    saveToStorage();
                    renderTodos();
                    renderDones();
                    showToast('Task restored to to-do list', 'info');
                }, 300);
            } else {
                todos.unshift(task);
                dones.splice(idx, 1);
                saveToStorage();
                renderTodos();
                renderDones();
                showToast('Task restored to to-do list', 'info');
            }
        }

        // Delete All
        deleteAllBtn.addEventListener('click', function() {
            if (todos.length === 0) {
                showToast('No tasks to delete', 'info');
                return;
            }
            showConfirm(
                'Delete All Tasks',
                'This will permanently remove all ' + todos.length + ' pending task(s). This cannot be undone.',
                function() {
                    todos = [];
                    saveToStorage();
                    renderTodos();
                    showToast('All tasks deleted', 'info');
                }
            );
        });

        // Clear Done
        clearDoneBtn.addEventListener('click', function() {
            if (dones.length === 0) {
                showToast('No completed tasks to clear', 'info');
                return;
            }
            showConfirm(
                'Clear Completed',
                'This will remove all ' + dones.length + ' completed task(s). This cannot be undone.',
                function() {
                    dones = [];
                    saveToStorage();
                    renderDones();
                    showToast('Completed tasks cleared', 'info');
                }
            );
        });

        // Done List Toggle
        doneToggle.addEventListener('click', function(e) {
            // Don't toggle if clicking the clear button
            if (e.target.closest('.btn-clear-done')) return;
            doneExpanded = !doneExpanded;
            doneListWrap.classList.toggle('collapsed', !doneExpanded);
            doneToggleIcon.classList.toggle('collapsed', !doneExpanded);
            doneToggle.setAttribute('aria-expanded', doneExpanded.toString());
        });

        doneToggle.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                doneToggle.click();
            }
        });

        // Filter Tabs
        document.querySelectorAll('.filter-tab').forEach(function(tab) {
            tab.addEventListener('click', function() {
                document.querySelectorAll('.filter-tab').forEach(function(t) {
                    t.classList.remove('active');
                    t.setAttribute('aria-selected', 'false');
                });
                tab.classList.add('active');
                tab.setAttribute('aria-selected', 'true');
                currentFilter = tab.dataset.filter;
                renderTodos();
            });
        });

        // Edit Modal
        function openEditModal(id) {
            var task = todos.find(function(t) { return t.id === id; });
            if (!task) return;

            editingId = id;
            editName.value     = task.name;
            editJob.value      = task.jobTitle;
            editTask.value     = task.task;
            editPriority.value = task.priority;
            editDueDate.value  = task.dueDate || '';

            // Clear any previous errors
            [editName, editJob, editTask].forEach(function(el) {
                el.classList.remove('error');
            });
            ['editNameError', 'editJobError', 'editTaskError'].forEach(function(id) {
                document.getElementById(id).classList.remove('visible');
            });

            editModal.classList.add('active');
            editName.focus();
        }

        function closeEditModal() {
            editModal.classList.remove('active');
            editingId = null;
        }

        document.getElementById('modalClose').addEventListener('click', closeEditModal);
        document.getElementById('editCancel').addEventListener('click', closeEditModal);
        editModal.addEventListener('click', function(e) {
            if (e.target === editModal) closeEditModal();
        });

        editForm.addEventListener('submit', function(e) {
            e.preventDefault();

            var valid = true;
            valid = validateField(editName, 'editNameError') && valid;
            valid = validateField(editJob, 'editJobError') && valid;
            valid = validateField(editTask, 'editTaskError') && valid;

            if (!valid) return;

            var idx = todos.findIndex(function(t) { return t.id === editingId; });
            if (idx === -1) { closeEditModal(); return; }

            todos[idx].name      = editName.value.trim();
            todos[idx].jobTitle  = editJob.value.trim();
            todos[idx].task      = editTask.value.trim();
            todos[idx].priority  = editPriority.value;
            todos[idx].dueDate   = editDueDate.value || null;

            saveToStorage();
            renderTodos();
            closeEditModal();
            showToast('Task updated successfully', 'success');
        });

        // Keyboard Shortcuts
        document.addEventListener('keydown', function(e) {
            // Escape closes modals
            if (e.key === 'Escape') {
                if (confirmModal.classList.contains('active')) {
                    hideConfirm();
                } else if (editModal.classList.contains('active')) {
                    closeEditModal();
                }
            }
        });

        // Auto-Refresh Overdue Status
        // Check every 60 seconds to update overdue indicators in real-time
        setInterval(function() {
            renderTodos();
            updateCounts();
        }, 60000);

        // ===== Initialize =====
        function init() {
            loadFromStorage();
            renderTodos();
            renderDones();
            updateCounts();
        }

        init();

    })();
