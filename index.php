<?php
session_start();

// ---------- Session storage ----------
$_SESSION['tasks'] = $_SESSION['tasks'] ?? [];

$errors = [];
$showAddModal = false;

// ---------- Server-side validation ----------
function validateTask($title, $description, $date, $priority)
{
    $errs = [];

    if ($title === '') {
        $errs[] = "Task title cannot be empty.";
    } elseif (strlen($title) < 3) {
        $errs[] = "Task title must be at least 3 characters long.";
    } elseif (strlen($title) > 100) {
        $errs[] = "Task title cannot exceed 100 characters.";
    }

    if (strlen($description) > 255) {
        $errs[] = "Description cannot exceed 255 characters.";
    }

    $d = DateTime::createFromFormat('Y-m-d', $date);
    if (!$d || $d->format('Y-m-d') !== $date) {
        $errs[] = "Please choose a valid due date.";
    }

    if (!in_array($priority, ['low', 'medium', 'high'], true)) {
        $errs[] = "Please choose a valid priority.";
    }

    return $errs;
}

// ---------- Print one task <li> (used for the list and the Bin) ----------
function renderTask($id, $task, $inBin = false)
{ ?>
    <li class="task-item<?= $task['status'] === 'completed' ? ' completed' : '' ?>"
        draggable="true"
        data-id="<?= htmlspecialchars($id) ?>"
        data-date="<?= htmlspecialchars($task['date']) ?>"
        data-priority="<?= htmlspecialchars($task['priority']) ?>"
        data-status="<?= htmlspecialchars($task['status']) ?>"
        data-important="<?= $task['priority'] === 'high' ? 'true' : 'false' ?>">

        <div class="task-card">

            <div class="task-title-row">
                <input type="checkbox" class="task-checkbox"
                    <?= $task['status'] === 'completed' ? 'checked' : '' ?>>
                <h3><?= htmlspecialchars($task['title']) ?></h3>
            </div>

            <p class="task-description"><?= htmlspecialchars($task['description']) ?></p>

            <div class="task-meta">
                <span class="task-date"><?= date('F j, Y', strtotime($task['date'])) ?></span>
                <span class="priority-badge <?= htmlspecialchars($task['priority']) ?>">
                    <?= strtoupper(htmlspecialchars($task['priority'])) ?>
                </span>
            </div>

            <button class="delete-task-btn" type="button" title="Delete task">
                <i class="fas fa-trash-alt"></i>
            </button>

            <?php if ($inBin): ?>
            <div class="bin-actions">
                <button type="button" class="restore-task-btn">
                    <i class="fas fa-undo"></i> Restore
                </button>
                <button type="button" class="permanent-delete-btn">
                    <i class="fas fa-trash"></i> Permanently Delete
                </button>
            </div>
            <?php endif; ?>

        </div>
    </li>
<?php }

// ---------- Handle POST: Create, Update, Delete ----------
if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    $action = $_POST['action'] ?? (isset($_POST['add_task']) ? 'add' : '');
    $id     = $_POST['id'] ?? '';
    $exists = isset($_SESSION['tasks'][$id]);

    switch ($action) {

        case 'add':      // CREATE
        case 'edit':     // UPDATE
            $title       = trim($_POST['task_title'] ?? '');
            $description = trim($_POST['task_description'] ?? '');
            $date        = $_POST['task_date'] ?? '';
            $priority    = strtolower($_POST['task_priority'] ?? '');

            $errors = validateTask($title, $description, $date, $priority);

            if (empty($errors)) {
                $data = [
                    'title'       => $title,
                    'description' => $description,
                    'date'        => $date,
                    'priority'    => $priority,
                ];

                if ($action === 'add') {
                    $_SESSION['tasks'][uniqid()] = $data + [
                        'status'    => 'pending', 
                        'deleted'   => false,
                    ];
                } elseif ($exists) {
                    $_SESSION['tasks'][$id] = $data + $_SESSION['tasks'][$id];
                }
            } else {
                $showAddModal = ($action === 'add');
            }
            break;

        case 'toggle':   // mark completed / pending
            if ($exists) {
                $current = $_SESSION['tasks'][$id]['status'];
                $_SESSION['tasks'][$id]['status'] =
                    ($current === 'completed') ? 'pending' : 'completed';
            }
            break;

        case 'trash':    // DELETE (move to Bin)
            if ($exists) {
                $_SESSION['tasks'][$id]['deleted'] = true;
            }
            break;

        case 'restore':  // take it back out of the Bin
            if ($exists) {
                $_SESSION['tasks'][$id]['deleted'] = false;
            }
            break;

        case 'delete':   // DELETE permanently
            unset($_SESSION['tasks'][$id]);
            break;

        case 'empty_bin':
            foreach ($_SESSION['tasks'] as $taskId => $task) {
                if ($task['deleted']) {
                    unset($_SESSION['tasks'][$taskId]);
                }
            }
            break;
    }

    // Post/Redirect/Get: refreshing the page will not re-submit the form
    if (empty($errors)) {
        header('Location: ' . $_SERVER['PHP_SELF']);
        exit;
    }
}

// ---------- READ: split the session tasks into list and Bin ----------
$activeTasks = array_filter($_SESSION['tasks'], fn($t) => !$t['deleted']);
$binTasks    = array_filter($_SESSION['tasks'], fn($t) => $t['deleted']);
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <title>CodesEye Task Manager</title>

    <!-- External CSS -->
    <link rel="stylesheet" href="style.css">

    <!-- Font Awesome Icons -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">

    <!-- Google Fonts: Plus Jakarta Sans -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>

    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
</head>

<body>

    <!-- App Header -->
    <header class="app-header">
        <div class="header-content">
            <h1>
                <i class="fa-solid fa-star-and-crescent"></i>
                Lunova
            </h1>

            <!-- Dark Mode Toggle -->
            <button id="theme-toggle" type="button" aria-label="Switch to dark mode">
            <i class="fas fa-moon" id="theme-icon"></i>
        </button>
        </div>
    </header>

    <!-- Main Content -->
    <div class="main-content">

        <!-- Sidebar -->
        <aside class="sidebar">

            <!-- Sidebar Menu -->
            <nav class="sidebar-menu">

                <button class="active" id="all-tasks" type="button">
                    <i class="fas fa-list"></i> All Tasks
                </button>

                <button id="today-tasks" type="button">
                    <i class="fas fa-calendar-day"></i> Today
                </button>

                <button id="important-tasks" type="button">
                    <i class="fas fa-star"></i> Important
                </button>

                <button id="completed-tasks" type="button">
                    <i class="fas fa-check-circle"></i> Completed
                </button>

                <button id="bin-nav" type="button">
                    <i class="fas fa-trash"></i> Bin
                </button>

            </nav>

            <!-- Statistics Section -->
            <section class="stats-section">
                <h4>Statistics</h4>

                <div class="stats-item">
                    <span>Total Tasks</span>
                    <span id="total-tasks-count">0</span>
                </div>

                <div class="stats-item">
                    <span>Completed</span>
                    <span id="completed-tasks-count">0</span>
                </div>

                <div class="stats-item">
                    <span>Pending</span>
                    <span id="pending-tasks-count">0</span>
                </div>
            </section>

        </aside>

        <!-- Main Task Content -->
        <main class="task-content">

            <!-- Task Header -->
            <section class="task-header">

                <h2 id="current-view">All Tasks</h2>

                <div class="task-actions">

                    <!-- Search -->
                    <div class="search-box">
                        <input
                            type="text"
                            id="task-search"
                            placeholder="Search tasks..."
                            aria-label="Search tasks"
                        >
                        <i class="fas fa-search"></i>
                    </div>

                    <!-- Add Task Button -->
                    <button id="add-task-btn" type="button">
                        <i class="fas fa-plus"></i> Add Task
                    </button>

                    <!-- Sort Dropdown -->
                    <div class="sort-container">

                     <button id="sort-tasks-btn" type="button">
                       <i class="fas fa-sort"></i> Sort
                        <i class="fas fa-chevron-down"></i>
                    </button>

                      <div class="sort-dropdown" id="sort-dropdown">

                    <button type="button" data-sort="alphabetical">
                    Alphabetical (A-Z)
                    </button>

                    <button type="button" data-sort="date">
                    Due Date (Earliest First)
                    </button>

        <button type="button" data-sort="priority">
            Priority (High to Low)
        </button>

        </div>

                </div>

                <!-- Empty Bin Button -->
            <button type="button" id="empty-bin-btn" class="empty-bin-action">
             <i class="fas fa-trash"></i> Empty Bin
            </button>

                </div>
            </section>

            <!-- Validation errors from PHP -->
            <?php if (!empty($errors)): ?>
                <div class="error-list">
                    <?php foreach ($errors as $error): ?>
                        <p><?= htmlspecialchars($error) ?></p>
                    <?php endforeach; ?>
                </div>
            <?php endif; ?>

            <!-- Task Filters -->
            <section class="task-filters">

                <div class="filter-item">
                    <label for="priority-filter">Priority:</label>

                    <select id="priority-filter">
                        <option value="all">All</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                    </select>
                </div>

                <div class="filter-item">
                    <label for="date-filter">Due Date:</label>

                    <select id="date-filter">
                        <option value="all">All</option>
                        <option value="today">Today</option>
                        <option value="week">This Week</option>
                        <option value="month">This Month</option>
                        <option value="overdue">Overdue</option>
                    </select>
                </div>

            </section>

            <section class="task-list-section">

                <ul class="task-list" id="task-list">
                  <?php foreach ($activeTasks as $id => $task) { renderTask($id, $task); } ?>
                 </ul>

              <!-- Empty Task Message -->
             <div class="empty-state" id="empty-state">
               <i class="fas fa-clipboard-list"></i>
                 <h3>No tasks yet!</h3>
               <p>Add a task to get started.</p>
              </div>

            </section>

                                <!-- BIN SECTION -->
            <section class="bin-section" id="bin-section" style="display: none;">

                <ul class="task-list" id="bin-task-list">
                    <?php foreach ($binTasks as $id => $task) { renderTask($id, $task, true); } ?>
                </ul>

                <div class="empty-state" id="bin-empty-state"<?= !empty($binTasks) ? ' style="display: none;"' : '' ?>>
                    <i class="fas fa-trash-alt"></i>
                    <h3>Your bin is empty!</h3>
                    <p>Deleted tasks will appear here.</p>
                </div>

            </section>

        </main>

    </div>   


        <!-- Add Task Modal -->
    <section class="add-task-section<?= $showAddModal ? ' show' : '' ?>" id="add-task-section">

    <div class="modal-overlay" id="modal-overlay"></div>

    <div class="add-task-modal">

        <div class="modal-header">
            <div>
                <h3>
                    <i class="fas fa-plus-circle"></i> Create New Task
                </h3>
            </div>

            <button type="button" id="close-task-btn" class="close-task-btn">
                <i class="fas fa-times"></i>
            </button>
        </div>

        <form id="add-task-form" method="POST" action="">

            <div class="form-group">
                <label for="task-title">Task Title</label>
                <input
                    type="text"
                    id="task-title"
                    name="task_title"
                    placeholder="What needs to get done?"
                    required
                >
            </div>

            <div class="form-group">
                <label for="task-description">Description</label>
                <textarea
                    id="task-description"
                    name="task_description"
                    placeholder="Add some details..."
                ></textarea>
            </div>

            <div class="form-group">
                <label for="task-date">Due Date</label>
                <input
                    type="date"
                    id="task-date"
                    name="task_date"
                >
            </div>

            <div class="form-group">
                <label for="task-priority">Priority</label>
                <select id="task-priority" name="task_priority">
                    <option value="low">Low</option>
                    <option value="medium" selected>Medium</option>
                    <option value="high">High</option>
                </select>
            </div>

            <div class="form-buttons">
                <button type="button" id="cancel-task-btn">
                    Cancel
                </button>

                <button type="submit" name="add_task">
                    <i class="fas fa-plus"></i> Create Task
                </button>
            </div>

        </form>

    </div>

    </section>


    <!-- EDIT TASK MODAL -->
    <div id="editTaskModal" class="modal">
    <div class="modal-content">
        <div class="modal-header">
            <h2>Edit Task</h2>
            <button type="button" id="closeEditModal">&times;</button>
        </div>

        <form id="editTaskForm" method="POST" action="">
            <input type="hidden" name="action" value="edit">
            <input type="hidden" name="id" id="editTaskId">

            <label for="editTaskTitle">Task Title</label>
            <input type="text" id="editTaskTitle" name="task_title" required>

            <label for="editTaskDescription">Description</label>
            <textarea id="editTaskDescription" name="task_description"></textarea>

            <label for="editTaskDate">Due Date</label>
            <input type="date" id="editTaskDate" name="task_date">

            <label for="editTaskPriority">Priority</label>
            <select id="editTaskPriority" name="task_priority">
                <option value="low">Low</option>
                <option value="medium" selected>Medium</option>
            <option value="high">High</option>
            </select>

            <div class="modal-actions">
                <button type="button" id="cancelEdit">Cancel</button>
                <button type="submit" id="saveEdit">Save Changes</button>
            </div>
        </form>
    </div>
    </div>

    
    <!-- Hidden form used by script.js for toggle / trash / restore / delete / empty bin -->
    <form id="action-form" method="POST" action="" hidden>
        <input type="hidden" name="action" id="action-type">
        <input type="hidden" name="id" id="action-id">
    </form>

    <!-- External JavaScript -->
    <script src="script.js" defer></script>

</body>
</html>