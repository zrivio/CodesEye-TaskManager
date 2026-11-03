document.addEventListener("DOMContentLoaded", function () {

    
    // ===================================
    // DARK MODE TOGGLE
    // ===================================

    const themeToggle = document.getElementById("theme-toggle");
    const themeIcon = document.getElementById("theme-icon");

    // Load saved theme
    const savedTheme = localStorage.getItem("taskManagerTheme");

    if (savedTheme === "dark") {
        document.body.classList.add("dark-mode");
        themeIcon.classList.replace("fa-moon", "fa-sun");
        themeToggle.setAttribute("aria-label", "Switch to light mode");
    }

    // Switch theme when clicked
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


    // ===================================
    // 1. ELEMENT REFERENCES
    // ===================================

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


    // EDIT TASK MODAL ELEMENTS
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
    const dateFilter = document.getElementById("date-filter");

    let activeTab = "All Tasks";


    // ===================================
// ADD NEW TASK MODAL
// ===================================

// OPEN MODAL
addTaskBtn.addEventListener("click", function () {
    addTaskSection.classList.add("show");
});

// CLOSE MODAL
function closeAddTaskModal() {
    addTaskSection.classList.remove("show");
}

// CLOSE BUTTON (X)
closeTaskBtn.addEventListener("click", closeAddTaskModal);

// CANCEL BUTTON
cancelTaskBtn.addEventListener("click", closeAddTaskModal);

// CLICK OUTSIDE MODAL
modalOverlay.addEventListener("click", closeAddTaskModal);



    // ===================================
    // 3. TEMPORARY SAMPLE TASKS
    // Remove this section when mag-connect na sa backend
    // ===================================

    taskList.innerHTML = `

        <li class="task-item"
            data-date="2026-11-03"
            data-priority="High"
            data-status="pending"
            data-important="true">

            <div class="task-card">

                <div class="task-title-row">
                    <input type="checkbox" class="task-checkbox">
                    <h3>Finish Web Development activity</h3>
                </div>

                <p class="task-description">
                    Complete the JavaScript functionality.
                </p>

                <div class="task-meta">
                    <span class="task-date">November 3, 2026</span>
                    <span class="priority-badge high">HIGH</span>
                </div>

                <button class="delete-task-btn" type="button" title="Delete task">
                <i class="fas fa-trash-alt"></i>
                </button>

            </div>
        </li>


        <li class="task-item"
            data-date="2026-11-05"
            data-priority="Low"
            data-status="pending"
            data-important="false">

            <div class="task-card">

                <div class="task-title-row">
                    <input type="checkbox" class="task-checkbox">
                    <h3>Submit Multimedia assignment</h3>
                </div>

                <p class="task-description">
                    Finalize the poster redesign.
                </p>

                <div class="task-meta">
                    <span class="task-date">November 5, 2026</span>
                    <span class="priority-badge low">LOW</span>
                </div>

                <button class="delete-task-btn" type="button" title="Delete task">
                    <i class="fas fa-trash-alt"></i>
                </button>

            </div>
        </li>


        <li class="task-item"
            data-date="2026-11-02"
            data-priority="Medium"
            data-status="pending"
            data-important="false">

            <div class="task-card">

                <div class="task-title-row">
                    <input type="checkbox" class="task-checkbox">
                    <h3>Study for examination</h3>
                </div>

                <p class="task-description">
                    Review the upcoming lessons.
                </p>

                <div class="task-meta">
                    <span class="task-date">November 2, 2026</span>
                    <span class="priority-badge medium">MEDIUM</span>
                </div>

                <button class="delete-task-btn" type="button" title="Delete task">
                    <i class="fas fa-trash-alt"></i>
                </button>

            </div>
        </li>

    `;


    // ===================================
    // 4. TASK FILTERING
    // ===================================

    function applyTaskFilters() {

        const searchValue = taskSearch.value.toLowerCase().trim();
        const selectedPriority = priorityFilter.value;
        const selectedDate = dateFilter.value;

        // Get today's date
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayDate = [
            today.getFullYear(),
            String(today.getMonth() + 1).padStart(2, "0"),
            String(today.getDate()).padStart(2, "0")
        ].join("-");


        // Get Monday and Sunday of the current week
        const startOfWeek = new Date(today);

        const day = today.getDay();

        startOfWeek.setDate(
            today.getDate() - (day === 0 ? 6 : day - 1)
        );

        const endOfWeek = new Date(startOfWeek);

        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);


        // Get beginning and end of current month
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

            const taskText = task.textContent.toLowerCase();

            const priority = (
                task.dataset.priority || ""
            ).toLowerCase();

            const status = task.dataset.status || "pending";

            const important = task.dataset.important || "false";

            const dateValue = task.dataset.date || "";

            const taskDate = dateValue
                ? new Date(dateValue + "T00:00:00")
                : null;


            let showTask = true;


            // SEARCH FILTER
            if (!taskText.includes(searchValue)) {
                showTask = false;
            }


            // PRIORITY FILTER
            if (
                selectedPriority !== "all" &&
                priority !== selectedPriority
            ) {
                showTask = false;
            }


            // DUE DATE FILTER

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

            else if (selectedDate === "overdue") {

                showTask = showTask &&
                    taskDate !== null &&
                    taskDate < today &&
                    status !== "completed";

            }


            // SIDEBAR FILTER

            if (activeTab === "Today") {

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


            // SHOW OR HIDE TASK
            task.style.display = showTask ? "" : "none";


            if (showTask) {
                visibleTasks++;
            }

        });


        // SHOW EMPTY STATE WHEN NO TASKS MATCH
        emptyState.style.display =
            visibleTasks === 0 ? "block" : "none";


        updateTaskStatistics();
    }


// ===================================
// SIDEBAR TAB SWITCHING
// ===================================

function switchTab(tab, clickedButton) {

    // Remove active highlight from all buttons
    sidebarButtons.forEach(function (button) {
        button.classList.remove("active");
    });

    // Highlight selected button
    clickedButton.classList.add("active");

    // Update page heading
    currentView.textContent = tab;

    // Remember selected sidebar tab
    activeTab = tab;
    document.body.classList.toggle("bin-view", tab === "Bin");

    console.log("Current active tab:", activeTab);

    // Check if Bin is selected
    const isBin = tab === "Bin";

    // Toggle regular task content
    taskFilters.style.display = isBin ? "none" : "";
    taskListSection.style.display = isBin ? "none" : "";

    // Toggle Bin content
    binSection.style.display = isBin ? "block" : "none";

    // Hide regular empty state while viewing Bin
    emptyState.style.display = isBin ? "none" : "";

    // Apply filters only on regular task pages
    if (!isBin) {
        applyTaskFilters();
    }
}


    // SIDEBAR BUTTON EVENTS

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


    // ===================================
    // 6. SEARCH AND DROPDOWN FILTERS
    // ===================================

    // Search tasks
    taskSearch.addEventListener("input", applyTaskFilters);


    // Filter by priority
    priorityFilter.addEventListener("change", applyTaskFilters);


    // Filter by due date
    dateFilter.addEventListener("change", applyTaskFilters);


// ===================================
// 7. SORT TASKS
// ===================================

const sortTasksBtn = document.getElementById("sort-tasks-btn");
const sortDropdown = document.getElementById("sort-dropdown");

const sortOptions = document.querySelectorAll("[data-sort]");

// Show or hide sort options
sortTasksBtn.addEventListener("click", function () {
    sortDropdown.classList.toggle("show");
});

// Sort selected option
sortOptions.forEach(function (option) {

    option.addEventListener("click", function () {

        const sortType = option.dataset.sort;

        // Detect which task list is currently active
        const targetTaskList = activeTab === "Bin"
            ? binTaskList
            : taskList;

        const tasks = Array.from(
            targetTaskList.querySelectorAll(".task-item")
        );

        // ALPHABETICAL SORT
        if (sortType === "alphabetical") {

            tasks.sort(function (a, b) {

                return a.querySelector("h3").textContent
                    .localeCompare(
                        b.querySelector("h3").textContent
                    );

            });

        }

        // DUE DATE SORT
        else if (sortType === "date") {

            tasks.sort(function (a, b) {

                return a.dataset.date.localeCompare(
                    b.dataset.date
                );

            });

        }

        // PRIORITY SORT
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

        // Rearrange task elements in the active list
        tasks.forEach(function (task) {
            targetTaskList.appendChild(task);
        });

        // Close dropdown
        sortDropdown.classList.remove("show");

        // Update sort button text
        sortTasksBtn.innerHTML =
            '<i class="fas fa-sort"></i> ' +
            option.textContent.trim() +
            ' <i class="fas fa-chevron-down"></i>';

        // Reapply filters only for regular task lists
        if (activeTab !== "Bin") {
            applyTaskFilters();
        }

    });

});


    // ===================================
    // 8. ADD NEW TASK WITH PRIORITY BADGE
    // ===================================

    addTaskForm.addEventListener("submit", function (event) {

        event.preventDefault();

        const formData = new FormData(addTaskForm);

        const title = formData.get("task_title").trim();

        const description = formData.get("task_description").trim();

        const date = formData.get("task_date");

        const priority = formData.get("task_priority");


        // Validate required fields
        if (!title || !date || !priority) {

            alert("Please complete the required task fields.");

            return;

        }


        // Determine badge color
        const priorityClass = priority.toLowerCase();


        // Create task list item
        const newTask = document.createElement("li");

        newTask.draggable = true;

        newTask.className = "task-item";

        newTask.dataset.date = date;

        newTask.dataset.priority = priority;

        newTask.dataset.status = "pending";

        newTask.dataset.important = "false";


        // Create task card
        const taskCard = document.createElement("div");

        taskCard.className = "task-card";

        // Create delete button
    const deleteBtn = document.createElement("button");

    deleteBtn.className = "delete-task-btn";
    deleteBtn.type = "button";
    deleteBtn.title = "Delete task";

    deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';

        // Create title row
        const titleRow = document.createElement("div");

        titleRow.className = "task-title-row";


        // Create checkbox
        const checkbox = document.createElement("input");

        checkbox.type = "checkbox";

        checkbox.className = "task-checkbox";


        // Create title
        const taskTitle = document.createElement("h3");

        taskTitle.textContent = title;


        titleRow.append(checkbox, taskTitle, deleteBtn);


        // Create description
        const taskDescription = document.createElement("p");

        taskDescription.className = "task-description";

        taskDescription.textContent = description;


        // Create task metadata
        const taskMeta = document.createElement("div");

        taskMeta.className = "task-meta";


        // Create formatted date
        const taskDate = document.createElement("span");

        taskDate.className = "task-date";

        taskDate.textContent = new Date(date + "T00:00:00")
            .toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric"
            });


        // Create priority badge
        const priorityBadge = document.createElement("span");

        priorityBadge.className =
            "priority-badge " + priorityClass;

        priorityBadge.textContent = priority.toUpperCase();


        // Assemble task card
        taskMeta.append(taskDate, priorityBadge);

        taskCard.append(
            titleRow,
            taskDescription,
            taskMeta,
            deleteBtn
        );

        newTask.appendChild(taskCard);


        // Add task to the list
        taskList.appendChild(newTask);


        // Reset and hide form
        addTaskForm.reset();

        addTaskSection.classList.remove("show");


        // Reapply active filters
        applyTaskFilters();

    });


    // ===================================
    // 9. TASK COMPLETION
    // ===================================

    taskList.addEventListener("change", function (event) {

        if (event.target.classList.contains("task-checkbox")) {

            const task = event.target.closest(".task-item");


            if (event.target.checked) {

                task.dataset.status = "completed";

                task.classList.add("completed");

            }

            else {

                task.dataset.status = "pending";

                task.classList.remove("completed");

            }


            // Reapply filters after completion
            applyTaskFilters();

        }

    });

// ===================================
// 10. DELETE TASK (MOVE TO BIN)
// ===================================

taskList.addEventListener("click", function (event) {
    const deleteBtn = event.target.closest(".delete-task-btn");
    if (!deleteBtn) return;

    const task = deleteBtn.closest(".task-item");
    if (!task) return;

    if (confirm("Move this task to the Bin?")) {

        // Create Bin action buttons
        const binActions = document.createElement("div");
        binActions.className = "bin-actions";

        binActions.innerHTML = `
            <button type="button" class="restore-task-btn">
                <i class="fas fa-undo"></i> Restore
            </button>

            <button type="button" class="permanent-delete-btn">
                <i class="fas fa-trash"></i> Permanently Delete
            </button>
        `;

        const taskCard = task.querySelector(".task-card");

    if (taskCard) {
    taskCard.appendChild(binActions);
    }

        // Move task to Bin
        binTaskList.appendChild(task);

        applyTaskFilters();
        binEmptyState.style.display = "none";
    }
});

    // ===================================
// 11. BIN ACTIONS
// ===================================

binTaskList.addEventListener("click", function (event) {

    const task = event.target.closest(".task-item");
    if (!task) return;

    // RESTORE TASK
    const restoreBtn = event.target.closest(".restore-task-btn");

    if (restoreBtn) {
        task.querySelector(".bin-actions").remove();

        taskList.appendChild(task);

        binEmptyState.style.display =
            binTaskList.children.length === 0 ? "block" : "none";

        applyTaskFilters();
        return;
    }

    // PERMANENTLY DELETE TASK
    const permanentDeleteBtn = event.target.closest(".permanent-delete-btn");

    if (permanentDeleteBtn) {
        if (confirm("Permanently delete this task? This cannot be undone.")) {
            task.remove();

            binEmptyState.style.display =
                binTaskList.children.length === 0 ? "block" : "none";
        }
    }
});


    // ===================================
// 12. EMPTY BIN
// ===================================

emptyBinBtn.addEventListener("click", function () {

    if (binTaskList.children.length === 0) {
        alert("Your Bin is already empty!");
        return;
    }

    if (confirm("Are you sure you want to permanently delete all tasks in the Bin? This cannot be undone.")) {

        // Permanently remove all deleted tasks
        binTaskList.innerHTML = "";

        // Show empty Bin message
        binEmptyState.style.display = "block";
    }
});

    // ===================================
// 11. EDIT TASK
// ===================================

// OPEN EDIT MODAL
taskList.addEventListener("click", function (event) {

    // Ignore checkbox and delete button clicks
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

    // Get current task details
    editTaskTitle.value =
        taskCard.querySelector(".task-title-row h3").textContent;

    editTaskDescription.value =
        taskCard.querySelector(".task-description").textContent.trim();

    editTaskDate.value = editingTask.dataset.date;

    editTaskPriority.value =
        editingTask.dataset.priority.toLowerCase();

    // Show modal
    editTaskModal.style.display = "flex";
});


// CLOSE EDIT MODAL
function closeEditTaskModal() {
    editTaskModal.style.display = "none";
    editingTask = null;
}

closeEditModal.addEventListener("click", closeEditTaskModal);
cancelEdit.addEventListener("click", closeEditTaskModal);

// CLOSE WHEN CLICKING OUTSIDE
editTaskModal.addEventListener("click", function (event) {
    if (event.target === editTaskModal) {
        closeEditTaskModal();
    }
});

// SAVE EDITED TASK
editTaskForm.addEventListener("submit", function (event) {

    event.preventDefault();

    if (!editingTask) return;

    const title = editTaskTitle.value.trim();
    const description = editTaskDescription.value.trim();
    const date = editTaskDate.value;
    const priority = editTaskPriority.value;

    if (!title || !date || !priority) {
        alert("Please complete the required task fields.");
        return;
    }

    const taskCard = editingTask.querySelector(".task-card");

    // Update title
    taskCard.querySelector(".task-title-row h3").textContent = title;

    // Update description
    taskCard.querySelector(".task-description").textContent = description;

    // Update date
    editingTask.dataset.date = date;

    taskCard.querySelector(".task-date").textContent =
        new Date(date + "T00:00:00").toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric"
        });

    // Update priority
    editingTask.dataset.priority = priority;

    const priorityBadge =
        taskCard.querySelector(".priority-badge");

    priorityBadge.className =
        "priority-badge " + priority;

    priorityBadge.textContent = priority.toUpperCase();

    // Close modal
    closeEditTaskModal();

    // Refresh filters and statistics
    applyTaskFilters();
});

    // ===================================
// DRAG AND DROP TASKS
// ===================================

let draggedTask = null;

// Make existing tasks draggable
taskList.querySelectorAll(".task-item").forEach(task => {
    task.draggable = true;
});

// Start dragging
taskList.addEventListener("dragstart", function (event) {
    const task = event.target.closest(".task-item");

    if (!task) return;

    draggedTask = task;
    task.classList.add("dragging");

    event.dataTransfer.effectAllowed = "move";
});

// While dragging over another task
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

// Finish dragging
taskList.addEventListener("dragend", function () {
    if (draggedTask) {
        draggedTask.classList.remove("dragging");
    }

    draggedTask = null;
});


    // ===================================
    // UPDATE TASK STATISTICS
    // ===================================

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


    // ===================================
    // 10. INITIAL PAGE VIEW
    // ===================================

    switchTab("All Tasks", allTasksBtn);

});