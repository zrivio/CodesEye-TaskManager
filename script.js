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
    const dateFilter = document.getElementById("date-filter");

    let activeTab = "All Tasks";

    // Sends toggle / trash / restore / delete / empty_bin to PHP
    // through the hidden #action-form in index.php
    function submitAction(action, id) {
        document.getElementById("action-type").value = action;
        document.getElementById("action-id").value = id || "";
        document.getElementById("action-form").submit();
    }


    // ---------- Add task modal ----------

addTaskBtn.addEventListener("click", function () {
    addTaskSection.classList.add("show");
});

function closeAddTaskModal() {
    addTaskSection.classList.remove("show");
}

closeTaskBtn.addEventListener("click", closeAddTaskModal);

cancelTaskBtn.addEventListener("click", closeAddTaskModal);

modalOverlay.addEventListener("click", closeAddTaskModal);





    // ---------- Filtering ----------

    function applyTaskFilters() {

        const searchValue = taskSearch.value.toLowerCase().trim();
        const selectedPriority = priorityFilter.value;
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

            else if (selectedDate === "overdue") {

                showTask = showTask &&
                    taskDate !== null &&
                    taskDate < today &&
                    status !== "completed";
            }


            // Sidebar tab (Today / Important / Completed)

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

function switchTab(tab, clickedButton) {

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

    // Filters only apply to the regular list
    if (!isBin) {
        applyTaskFilters();
    }
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

    taskSearch.addEventListener("input", applyTaskFilters);


    priorityFilter.addEventListener("change", applyTaskFilters);


    dateFilter.addEventListener("change", applyTaskFilters);


// ---------- Sorting ----------

const sortTasksBtn = document.getElementById("sort-tasks-btn");
const sortDropdown = document.getElementById("sort-dropdown");

const sortOptions = document.querySelectorAll("[data-sort]");

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

        sortTasksBtn.innerHTML =
            '<i class="fas fa-sort"></i> ' +
            option.textContent.trim() +
            ' <i class="fas fa-chevron-down"></i>';

        // The Bin has no filters
        if (activeTab !== "Bin") {
            applyTaskFilters();
        }

    });

});


    // ---------- Add task (form submits to PHP) ----------

    addTaskForm.addEventListener("submit", function (event) {

        const formData = new FormData(addTaskForm);

        const title = formData.get("task_title").trim();
        const date = formData.get("task_date");
        const priority = formData.get("task_priority");

        // Quick check here; PHP validates again on the server
        if (!title || !date || !priority) {

            event.preventDefault();

            alert("Please complete the required task fields.");

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

    if (confirm("Move this task to the Bin?")) {
        submitAction("trash", task.dataset.id);
    }
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
        if (confirm("Permanently delete this task? This cannot be undone.")) {
            submitAction("delete", task.dataset.id);
        }
    }
});


    // ---------- Empty Bin ----------

emptyBinBtn.addEventListener("click", function () {

    if (binTaskList.children.length === 0) {
        alert("Your Bin is already empty!");
        return;
    }

    if (confirm("Are you sure you want to permanently delete all tasks in the Bin? This cannot be undone.")) {
        submitAction("empty_bin");
    }
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

    editTaskModal.style.display = "flex";
});


function closeEditTaskModal() {
    editTaskModal.style.display = "none";
    editingTask = null;
}

closeEditModal.addEventListener("click", closeEditTaskModal);
cancelEdit.addEventListener("click", closeEditTaskModal);

editTaskModal.addEventListener("click", function (event) {
    if (event.target === editTaskModal) {
        closeEditTaskModal();
    }
});

editTaskForm.addEventListener("submit", function (event) {

    // Quick check here; PHP validates again on the server
    if (
        !editTaskTitle.value.trim() ||
        !editTaskDate.value ||
        !editTaskPriority.value
    ) {
        event.preventDefault();
        alert("Please complete the required task fields.");
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