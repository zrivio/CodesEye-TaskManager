document.addEventListener("DOMContentLoaded", function () {

    
    // ---------- Dark mode ----------

    const themeToggle = document.getElementById("theme-toggle");
    const themeIcon = document.getElementById("theme-icon");

    // Apply the theme saved in the browser
    const savedTheme = localStorage.getItem("taskManagerTheme");

    if (savedTheme === "dark") {
        document.body.classList.add("dark-mode");
        themeIcon.classList.replace("fa-moon", "fa-sun");
        themeToggle.setAttribute("aria-label", "Switch to light mode");
    }

    themeToggle.addEventListener("click", function () {

        document.body.classList.toggle("dark-mode");

        if (document.body.classList.contains("dark-mode")) {
            themeIcon.classList.replace("fa-moon", "fa-sun");
            themeToggle.setAttribute("aria-label", "Switch to light mode");
            localStorage.setItem("taskManagerTheme", "dark");
        } else {
            themeIcon.classList.replace("fa-sun", "fa-moon");
            themeToggle.setAttribute("aria-label", "Switch to dark mode");
            localStorage.setItem("taskManagerTheme", "light");
        }

    });


    // ---------- Element references ----------

    const addTaskBtn = document.getElementById("add-task-btn");
    const addTaskSection = document.getElementById("add-task-section");
    const cancelTaskBtn = document.getElementById("cancel-task-btn");
    const addTaskForm = document.getElementById("add-task-form");

    const allTasksBtn = document.getElementById("all-tasks");
    const todayTasksBtn = document.getElementById("today-tasks");
    const importantTasksBtn = document.getElementById("important-tasks");
    const completedTasksBtn = document.getElementById("completed-tasks");

    const currentView = document.getElementById("current-view");


    const taskList = document.getElementById("task-list");
    const emptyState = document.getElementById("empty-state");

    const taskFilters = document.querySelector(".task-filters");
    const taskListSection = document.querySelector(".task-list-section");
    const taskActions = document.querySelector(".task-actions");

    const addTaskModal = document.querySelector(".add-task-modal");

    const binNav = document.getElementById("bin-nav");
    const binSection = document.getElementById("bin-section");
    const binTaskList = document.getElementById("bin-task-list");
    const binEmptyState = document.getElementById("bin-empty-state");
    const emptyBinBtn = document.getElementById("empty-bin-btn");

    const sidebarButtons = [
        allTasksBtn,
        todayTasksBtn,
        importantTasksBtn,
        completedTasksBtn,
        binNav
    ];


    // Edit modal elements
    const editTaskModal = document.getElementById("editTaskModal");
    const editTaskForm = document.getElementById("editTaskForm");

    const editTaskTitle = document.getElementById("editTaskTitle");
    const editTaskDescription = document.getElementById("editTaskDescription");
    const editTaskDate = document.getElementById("editTaskDate");
    const editTaskPriority = document.getElementById("editTaskPriority");

    const closeTaskBtn = document.getElementById("close-task-btn");
    const modalOverlay = document.getElementById("modal-overlay");

    const closeEditModal = document.getElementById("closeEditModal");
    const cancelEdit = document.getElementById("cancelEdit");

    let editingTask = null;

    const taskSearch = document.getElementById("task-search");
    const priorityFilter = document.getElementById("priority-filter");
    const priorityFilterItem = priorityFilter.closest(".filter-item");
    const dateFilter = document.getElementById("date-filter");

    const sortTasksBtn = document.getElementById("sort-tasks-btn");
    const sortDropdown = document.getElementById("sort-dropdown");
    const sortOptions = document.querySelectorAll("[data-sort]");

    const toastContainer = document.getElementById("toast-container");

    let activeTab = "All Tasks";

    // Search, Sort, Priority and Due Date values are kept separately for every page
    const defaultSortHTML =
        '<i class="fas fa-sort"></i> Sort <i class="fas fa-chevron-down"></i>';

    const pageState = {};

    ["All Tasks", "Today", "Important", "Completed", "Bin"].forEach(function (page) {
        pageState[page] = {
            search: "",
            priority: "all",
            date: "all",
            sortLabel: null,   // null = no sort chosen on this page
            order: null        // card order on this page (null = original order)
        };
    });

    // Remember the original (server) order of the cards
    Array.from(taskList.children).forEach(function (task, index) {
        task.dataset.index = index;
    });

    // Local date as YYYY-MM-DD (same day the person sees on their calendar)
    function localDateString() {
        const now = new Date();
        return [
            now.getFullYear(),
            String(now.getMonth() + 1).padStart(2, "0"),
            String(now.getDate()).padStart(2, "0")
        ].join("-");
    }

    // Sends toggle / trash / restore / delete / empty_bin to PHP
    // through the hidden #action-form in index.php
    function submitAction(action, id) {
        document.getElementById("action-type").value = action;
        document.getElementById("action-id").value = id || "";
        document.getElementById("action-completed-on").value = localDateString();
        document.getElementById("action-form").submit();
    }

    // ---------- Pop-up open / close (with a short fade) ----------

    const POPUP_ANIMATION_MS = 200;

    function showPopup(popup) {
        clearTimeout(popup.hideTimer);
        popup.classList.remove("closing");
        popup.classList.add("show");
    }

    function hidePopup(popup, afterHide) {

        if (!popup.classList.contains("show") || popup.classList.contains("closing")) {
            return;
        }

        popup.classList.add("closing");

        popup.hideTimer = setTimeout(function () {
            popup.classList.remove("show", "closing");
            if (afterHide) afterHide();
        }, POPUP_ANIMATION_MS);
    }


    // ---------- Toast notifications ----------

    const TOAST_VISIBLE_MS = 3500;
    const TOAST_FADE_MS = 300;

    function showToast(message) {

        if (!message) return;

        const toast = document.createElement("div");
        toast.className = "toast";
        toast.setAttribute("role", "status");

        const icon = document.createElement("i");
        icon.className = "fas fa-circle-check";

        const text = document.createElement("span");
        text.textContent = message;

        toast.appendChild(icon);
        toast.appendChild(text);
        toastContainer.appendChild(toast);

        function removeToast() {
            clearTimeout(timer);
            toast.classList.add("hide");
            setTimeout(function () {
                toast.remove();
            }, TOAST_FADE_MS);
        }

        const timer = setTimeout(removeToast, TOAST_VISIBLE_MS);

        toast.addEventListener("click", removeToast);
    }

    // PHP leaves a one-time message here after a successful add / edit / delete / restore
    showToast(toastContainer.dataset.message);


    // ---------- Pop-up message ----------

    const appDialog = document.getElementById("app-dialog");
    const dialogMessage = document.getElementById("dialog-message");
    const dialogOk = document.getElementById("dialog-ok");
    const dialogCancel = document.getElementById("dialog-cancel");
    const dialogOverlay = document.getElementById("dialog-overlay");
    const dialogIcon = document.getElementById("dialog-icon");

    let dialogOnOk = null;
    let dialogOnClose = null;

    // options: confirm (show Cancel button), okText, onOk, onClose
    function openDialog(message, options) {

        options = options || {};

        dialogMessage.textContent = message;
        dialogOk.textContent = options.okText || "OK";
        dialogIcon.className = "fas " + (options.icon || "fa-circle-exclamation");
        dialogCancel.style.display = options.confirm ? "" : "none";

        dialogOnOk = options.onOk || null;
        dialogOnClose = options.onClose || null;

        showPopup(appDialog);
        dialogOk.focus();
    }

    function closeDialog(accepted) {

        hidePopup(appDialog);

        const onOk = dialogOnOk;
        const onClose = dialogOnClose;

        dialogOnOk = null;
        dialogOnClose = null;

        if (accepted && onOk) onOk();
        if (onClose) onClose();
    }

    dialogOk.addEventListener("click", function () {
        closeDialog(true);
    });

    dialogCancel.addEventListener("click", function () {
        closeDialog(false);
    });

    dialogOverlay.addEventListener("click", function () {
        closeDialog(false);
    });

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && appDialog.classList.contains("show")) {
            closeDialog(false);
        }
    });

    // Counts characters the way PHP's mb_strlen does (an emoji is 1, not 2)
    function textLength(text) {
        return Array.from(text).length;
    }

    // Checks the title / description / date / priority fields and returns the
    // first problem found (message + the field to focus), or null if all good.
    // The rules mirror validateTask() in index.php.
    function checkTaskFields(titleField, dateField, priorityField, descriptionField) {

        const title = titleField.value.trim();

        if (!title) {
            return { message: "Please enter a task title.", field: titleField };
        }

        if (textLength(title) < 3) {
            return { message: "Task title must be at least 3 characters long.", field: titleField };
        }

        if (textLength(title) > 100) {
            return { message: "Task title cannot exceed 100 characters.", field: titleField };
        }

        // Browsers send a line break as 2 characters (\r\n), so count it the same way
        if (descriptionField) {
            const description = descriptionField.value.trim().replace(/\r?\n/g, "\r\n");

            if (textLength(description) > 255) {
                return { message: "Description cannot exceed 255 characters.", field: descriptionField };
            }
        }

        if (!dateField.value) {
            return { message: "Please choose a due date.", field: dateField };
        }

        if (!priorityField.value) {
            return { message: "Please choose a priority.", field: priorityField };
        }

        return null;
    }


    // ---------- Add task modal ----------

addTaskBtn.addEventListener("click", function () {
    showPopup(addTaskSection);
});

function closeAddTaskModal() {
    hidePopup(addTaskSection);
}

closeTaskBtn.addEventListener("click", closeAddTaskModal);

cancelTaskBtn.addEventListener("click", closeAddTaskModal);

modalOverlay.addEventListener("click", closeAddTaskModal);





    // ---------- Filtering ----------

    // Text the search box looks at: title, description, date and priority
    function getSearchText(task) {
        return [".task-title-row", ".task-description", ".task-meta"]
            .map(function (selector) {
                const part = task.querySelector(selector);
                return part ? part.textContent : "";
            })
            .join(" ")
            .toLowerCase();
    }

    // The Bin only has Search (its own value, separate from the other pages)
    function applyBinFilters() {

        const searchValue = taskSearch.value.toLowerCase().trim();

        let visibleTasks = 0;

        binTaskList.querySelectorAll(".task-item").forEach(function (task) {

            const showTask = getSearchText(task).includes(searchValue);

            task.style.display = showTask ? "" : "none";

            if (showTask) {
                visibleTasks++;
            }
        });

        binEmptyState.style.display = visibleTasks === 0 ? "" : "none";
    }

    // Re-applies the filters of whichever page is open
    function refreshCurrentPage() {
        if (activeTab === "Bin") {
            applyBinFilters();
        } else {
            applyTaskFilters();
        }
    }

    function applyTaskFilters() {

        const searchValue = taskSearch.value.toLowerCase().trim();

        // The Important page has no Priority dropdown, so it never filters by priority
        const selectedPriority = activeTab === "Important"
            ? "all"
            : priorityFilter.value;

        const selectedDate = dateFilter.value;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayDate = [
            today.getFullYear(),
            String(today.getMonth() + 1).padStart(2, "0"),
            String(today.getDate()).padStart(2, "0")
        ].join("-");


        // Weeks run Monday to Sunday
        const startOfWeek = new Date(today);

        const day = today.getDay();

        startOfWeek.setDate(
            today.getDate() - (day === 0 ? 6 : day - 1)
        );

        const endOfWeek = new Date(startOfWeek);

        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);


        const startOfMonth = new Date(
            today.getFullYear(),
            today.getMonth(),
            1
        );

        const endOfMonth = new Date(
            today.getFullYear(),
            today.getMonth() + 1,
            0,
            23, 59, 59, 999
        );


        const tasks = taskList.querySelectorAll(".task-item");

        let visibleTasks = 0;


        tasks.forEach(function (task) {

            const taskText = getSearchText(task);

            const priority = (
                task.dataset.priority || ""
            ).toLowerCase();

            const status = task.dataset.status || "pending";

            const important = task.dataset.important || "false";

            const dateValue = task.dataset.date || "";

            const completedOn = task.dataset.completedAt || "";

            const taskDate = dateValue
                ? new Date(dateValue + "T00:00:00")
                : null;


            let showTask = true;

            // Search text
            if (!taskText.includes(searchValue)) {
                showTask = false;
            }

            // Priority
            if (
                selectedPriority !== "all" &&
                priority !== selectedPriority
            ) {
                showTask = false;
            }


            // Due date

            if (selectedDate === "today") {

                showTask = showTask &&
                    dateValue === todayDate;

            }

            else if (selectedDate === "week") {

                showTask = showTask &&
                    taskDate !== null &&
                    taskDate >= startOfWeek &&
                    taskDate <= endOfWeek;
            }

            else if (selectedDate === "month") {

                showTask = showTask &&
                    taskDate !== null &&
                    taskDate >= startOfMonth &&
                    taskDate <= endOfMonth;
            }

            else if (selectedDate === "overdue" && activeTab === "Completed") {

                // Completed page: overdue = finished after the due date
                showTask = showTask &&
                    dateValue !== "" &&
                    completedOn !== "" &&
                    completedOn > dateValue;
            }

            else if (selectedDate === "overdue") {

                showTask = showTask &&
                    taskDate !== null &&
                    taskDate < today &&
                    status !== "completed";
            }


            // Sidebar tab (All Tasks / Today / Important / Completed)

            if (activeTab === "All Tasks") {

                // Checked tasks live on the Completed page
                showTask = showTask &&
                    status !== "completed";
            }

            else if (activeTab === "Today") {

                showTask = showTask &&
                    dateValue === todayDate;
            }

            else if (activeTab === "Important") {

                showTask = showTask &&
                    important === "true";
            }

            else if (activeTab === "Completed") {

                showTask = showTask &&
                    status === "completed";
            }


            task.style.display = showTask ? "" : "none";

            if (showTask) {
                visibleTasks++;
            }

        });


        // Show the empty message when nothing matches
        emptyState.style.display =
            visibleTasks === 0 ? "block" : "none";


        updateTaskStatistics();
    }


// ---------- Sidebar tabs ----------

// Stores the controls of the page being left, so each page keeps its own values
function savePageState() {

    const state = pageState[activeTab];

    state.search = taskSearch.value;
    state.priority = priorityFilter.value;
    state.date = dateFilter.value;

    if (activeTab !== "Bin") {
        state.order = Array.from(taskList.children).map(function (task) {
            return task.dataset.id;
        });
    }
}

// Puts the controls and the card order of the page being opened back
function loadPageState(tab) {

    const state = pageState[tab];

    taskSearch.value = state.search;
    priorityFilter.value = state.priority;
    dateFilter.value = state.date;

    sortTasksBtn.innerHTML = state.sortLabel || defaultSortHTML;

    if (tab === "Bin") return;

    const cards = Array.from(taskList.children);

    if (state.order) {

        const byId = new Map(cards.map(function (task) {
            return [task.dataset.id, task];
        }));

        state.order.forEach(function (id) {
            if (byId.has(id)) taskList.appendChild(byId.get(id));
        });

    } else {

        cards
            .sort(function (a, b) {
                return Number(a.dataset.index) - Number(b.dataset.index);
            })
            .forEach(function (task) {
                taskList.appendChild(task);
            });
    }
}

// Short fade/slide every time a page is opened
function playPageTransition() {

    document.querySelectorAll(".task-content > section").forEach(function (section) {
        section.classList.remove("page-enter");
        void section.offsetWidth;
        section.classList.add("page-enter");
    });
}

let pagesReady = false;

function switchTab(tab, clickedButton) {

    if (pagesReady) {
        savePageState();
    }

    sidebarButtons.forEach(function (button) {
        button.classList.remove("active");
    });

    clickedButton.classList.add("active");

    currentView.textContent = tab;

    activeTab = tab;
    document.body.classList.toggle("bin-view", tab === "Bin");

    console.log("Current active tab:", activeTab);

    const isBin = tab === "Bin";

    // Bin view swaps out the regular list and its filters
    taskFilters.style.display = isBin ? "none" : "";
    taskListSection.style.display = isBin ? "none" : "";

    binSection.style.display = isBin ? "block" : "none";

    emptyState.style.display = isBin ? "none" : "";

    // Important only has the Due Date dropdown
    priorityFilterItem.style.display = tab === "Important" ? "none" : "";

    // The Bin has its own sort options
    sortOptions.forEach(function (option) {
        const forBin = option.dataset.view === "bin";
        option.style.display = forBin === isBin ? "" : "none";
    });

    sortDropdown.classList.remove("show");

    loadPageState(tab);

    refreshCurrentPage();

    pagesReady = true;

    playPageTransition();
}


    allTasksBtn.addEventListener("click", function () {
        switchTab("All Tasks", allTasksBtn);
    });

    todayTasksBtn.addEventListener("click", function () {
        switchTab("Today", todayTasksBtn);
    });

    importantTasksBtn.addEventListener("click", function () {
        switchTab("Important", importantTasksBtn);
    });

    completedTasksBtn.addEventListener("click", function () {
        switchTab("Completed", completedTasksBtn);
    });

    binNav.addEventListener("click", function () {
    switchTab("Bin", binNav);
    });


    // ---------- Search and filter events ----------

    taskSearch.addEventListener("input", refreshCurrentPage);


    priorityFilter.addEventListener("change", applyTaskFilters);


    dateFilter.addEventListener("change", applyTaskFilters);


// ---------- Sorting ----------

sortTasksBtn.addEventListener("click", function () {
    sortDropdown.classList.toggle("show");
});

sortOptions.forEach(function (option) {

    option.addEventListener("click", function () {

        const sortType = option.dataset.sort;

        // Sort whichever list is on screen (regular or Bin)
        const targetTaskList = activeTab === "Bin"
            ? binTaskList
            : taskList;

        const tasks = Array.from(
            targetTaskList.querySelectorAll(".task-item")
        );

        // A-Z
        if (sortType === "alphabetical") {

            tasks.sort(function (a, b) {

                return a.querySelector("h3").textContent
                    .localeCompare(
                        b.querySelector("h3").textContent
                    );

            });

        }

        // earliest due date first
        else if (sortType === "date") {

            tasks.sort(function (a, b) {

                return a.dataset.date.localeCompare(
                    b.dataset.date
                );

            });

        }

        // Bin: earliest deleted first
        else if (sortType === "deleted") {

            tasks.sort(function (a, b) {

                return Number(a.dataset.deletedAt) -
                    Number(b.dataset.deletedAt);

            });

        }

        // high to low
        else if (sortType === "priority") {

            const priorityOrder = {
                "high": 1,
                "medium": 2,
                "low": 3
            };

            tasks.sort(function (a, b) {

                return priorityOrder[
                    (a.dataset.priority || "").toLowerCase()
                ] - priorityOrder[
                    (b.dataset.priority || "").toLowerCase()
                ];

            });

        }

        // Put the sorted tasks back in the list
        tasks.forEach(function (task) {
            targetTaskList.appendChild(task);
        });

        sortDropdown.classList.remove("show");

        // Only this page remembers the chosen sort
        pageState[activeTab].sortLabel =
            '<i class="fas fa-sort"></i> ' +
            option.textContent.trim() +
            ' <i class="fas fa-chevron-down"></i>';

        sortTasksBtn.innerHTML = pageState[activeTab].sortLabel;

        refreshCurrentPage();

    });

});


    // ---------- Add task (form submits to PHP) ----------

    addTaskForm.addEventListener("submit", function (event) {

        const problem = checkTaskFields(
            addTaskForm.elements["task_title"],
            addTaskForm.elements["task_date"],
            addTaskForm.elements["task_priority"],
            addTaskForm.elements["task_description"]
        );

        // Quick check here; PHP validates again on the server
        if (problem) {

            event.preventDefault();

            openDialog(problem.message, {
                onClose: function () {
                    problem.field.focus();
                }
            });

        }

        // Otherwise the form submits to index.php

    });


    // ---------- Mark task as completed ----------

    taskList.addEventListener("change", function (event) {

        if (event.target.classList.contains("task-checkbox")) {

            const task = event.target.closest(".task-item");

            // PHP toggles pending/completed and reloads the page
            submitAction("toggle", task.dataset.id);

        }

    });

// ---------- Delete task (moves it to the Bin) ----------

taskList.addEventListener("click", function (event) {
    const deleteBtn = event.target.closest(".delete-task-btn");
    if (!deleteBtn) return;

    const task = deleteBtn.closest(".task-item");
    if (!task) return;

    openDialog("Move this task to the Bin?", {
        confirm: true,
        icon: "fa-trash-can",
        okText: "Move to Bin",
        onOk: function () {
            submitAction("trash", task.dataset.id);
        }
    });
});

    // ---------- Bin: restore or delete permanently ----------

binTaskList.addEventListener("click", function (event) {

    const task = event.target.closest(".task-item");
    if (!task) return;

    if (event.target.closest(".restore-task-btn")) {
        submitAction("restore", task.dataset.id);
        return;
    }

    if (event.target.closest(".permanent-delete-btn")) {
        openDialog("Permanently delete this task? This cannot be undone.", {
            confirm: true,
            icon: "fa-triangle-exclamation",
            okText: "Delete",
            onOk: function () {
                submitAction("delete", task.dataset.id);
            }
        });
    }
});


    // ---------- Empty Bin ----------

emptyBinBtn.addEventListener("click", function () {

    if (binTaskList.children.length === 0) {
        openDialog("Your Bin is already empty!");
        return;
    }

    openDialog("Permanently delete all tasks in the Bin? This cannot be undone.", {
        confirm: true,
        icon: "fa-triangle-exclamation",
        okText: "Empty Bin",
        onOk: function () {
            submitAction("empty_bin");
        }
    });
});

    // ---------- Edit task ----------

taskList.addEventListener("click", function (event) {

    // Checkbox and trash icon have their own actions
    if (
        event.target.closest(".task-checkbox") ||
        event.target.closest(".delete-task-btn")
    ) {
        return;
    }

    const taskCard = event.target.closest(".task-card");

    if (!taskCard) return;

    editingTask = taskCard.closest(".task-item");

    if (!editingTask) return;

    editTaskTitle.value =
        taskCard.querySelector(".task-title-row h3").textContent;

    editTaskDescription.value =
        taskCard.querySelector(".task-description").textContent.trim();

    editTaskDate.value = editingTask.dataset.date;

    // Tell PHP which task is being edited
    document.getElementById("editTaskId").value = editingTask.dataset.id;

    editTaskPriority.value =
        editingTask.dataset.priority.toLowerCase();

    showPopup(editTaskModal);
});


function closeEditTaskModal() {
    hidePopup(editTaskModal);
    editingTask = null;
}

closeEditModal.addEventListener("click", closeEditTaskModal);
cancelEdit.addEventListener("click", closeEditTaskModal);

document.getElementById("edit-modal-overlay").addEventListener("click", closeEditTaskModal);

editTaskForm.addEventListener("submit", function (event) {

    const problem = checkTaskFields(editTaskTitle, editTaskDate, editTaskPriority, editTaskDescription);

    // Quick check here; PHP validates again on the server
    if (problem) {
        event.preventDefault();

        openDialog(problem.message, {
            onClose: function () {
                problem.field.focus();
            }
        });
    }

    // Otherwise the form submits to index.php
});

    // ---------- Drag and drop (reorders on screen only, not saved) ----------

let draggedTask = null;

taskList.querySelectorAll(".task-item").forEach(task => {
    task.draggable = true;
});

taskList.addEventListener("dragstart", function (event) {
    const task = event.target.closest(".task-item");

    if (!task) return;

    draggedTask = task;
    task.classList.add("dragging");

    event.dataTransfer.effectAllowed = "move";
});

taskList.addEventListener("dragover", function (event) {
    event.preventDefault();

    const targetTask = event.target.closest(".task-item");

    if (!targetTask || targetTask === draggedTask) return;

    const rect = targetTask.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;

    if (event.clientY < midpoint) {
        taskList.insertBefore(draggedTask, targetTask);
    } else {
        taskList.insertBefore(draggedTask, targetTask.nextSibling);
    }
});

taskList.addEventListener("dragend", function () {
    if (draggedTask) {
        draggedTask.classList.remove("dragging");
    }

    draggedTask = null;
});


    // ---------- Statistics ----------
    function updateTaskStatistics() {

        const tasks = taskList.querySelectorAll(".task-item");

        const totalTasks = tasks.length;

        const completedTasks = taskList.querySelectorAll(
            ".task-item.completed"
        ).length;

        const pendingTasks = totalTasks - completedTasks;

        document.getElementById("total-tasks-count").textContent = totalTasks;

        document.getElementById("completed-tasks-count").textContent = completedTasks;

        document.getElementById("pending-tasks-count").textContent = pendingTasks;

    }


    // ---------- Initial view ----------
    switchTab("All Tasks", allTasksBtn);

});