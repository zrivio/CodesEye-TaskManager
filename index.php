<?php
session_start();

// ---------- Session storage ----------
$_SESSION['tasks'] = $_SESSION['tasks'] ?? [];

$errors = [];
$showAddModal = false;
$showEditModal = false;

// What the forms show again when the server rejects a submission
$formDefaults = ['title' => '', 'description' => '', 'date' => '', 'priority' => 'medium'];
$addForm      = $formDefaults;
$editForm     = $formDefaults;
$editId       = '';

// ---------- Bin retention ----------
// Deleted tasks can be restored for this many days. After that they are
// removed from the Bin permanently.
const BIN_RETENTION_DAYS = 30;

// Removes every Bin task that has been in the Bin for 30 days or more.
function purgeExpiredBinTasks()
{
    $cutoff = time() - (BIN_RETENTION_DAYS * 24 * 60 * 60);

    foreach ($_SESSION['tasks'] as $taskId => $task) {

        if (empty($task['deleted'])) {
            continue;
        }

        // Tasks deleted before this feature existed start their 30 days now
        if (empty($task['deleted_at'])) {
            $_SESSION['tasks'][$taskId]['deleted_at'] = time();
            continue;
        }

        if ($task['deleted_at'] <= $cutoff) {
            unset($_SESSION['tasks'][$taskId]);
        }
    }
}

// Runs on every request, before any action, so an expired task can never be restored
purgeExpiredBinTasks();

// ---------- Input helpers ----------

// Counts characters, not bytes, so accented letters and emoji count as 1 each
function textLength($text)
{
    return function_exists('mb_strlen') ? mb_strlen($text, 'UTF-8') : strlen($text);
}

// Reads one text field from $_POST. Anything that is not a plain string
// (for example task_title[]=x) counts as empty instead of crashing PHP.
function postString($key)
{
    $value = $_POST[$key] ?? '';

    return is_string($value) ? $value : '';
}

// ---------- Server-side validation ----------
function validateTask($title, $description, $date, $priority)
{
    $errs = [];

    if ($title === '') {
        $errs[] = "Task title cannot be empty.";
    } elseif (textLength($title) < 3) {
        $errs[] = "Task title must be at least 3 characters long.";
    } elseif (textLength($title) > 100) {
        $errs[] = "Task title cannot exceed 100 characters.";
    }

    if (textLength($description) > 255) {
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
        data-completed-at="<?= htmlspecialchars($task['completed_at'] ?? '') ?>"
        data-deleted-at="<?= (int) ($task['deleted_at'] ?? 0) ?>"
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

            <div class="task-card-actions">
                <?php if (!$inBin): ?>
                <button class="edit-task-btn" type="button" title="Edit task" aria-label="Edit task">
                    <i class="fas fa-pen-to-square"></i>
                </button>
                <?php endif; ?>

                <button class="delete-task-btn" type="button" title="Delete task">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>

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

    $action = isset($_POST['action']) ? postString('action') : (isset($_POST['add_task']) ? 'add' : '');
    $id     = postString('id');
    $exists = isset($_SESSION['tasks'][$id]);

    switch ($action) {

        case 'add':      // CREATE
        case 'edit':     // UPDATE
            $title       = trim(postString('task_title'));
            $description = trim(postString('task_description'));
            $date        = postString('task_date');
            $priority    = strtolower(postString('task_priority'));

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
                        'status'       => 'pending', 
                        'deleted'      => false,
                        'completed_at' => null,
                        'deleted_at'   => null,
                    ];
                    $_SESSION['flash'] = 'Task added successfully.';
                } elseif ($exists) {
                    $_SESSION['tasks'][$id] = $data + $_SESSION['tasks'][$id];
                    $_SESSION['flash'] = 'Task updated successfully.';
                }
            } else {
                // Give the form back what the person typed and re-open the same
                // pop-up, so the errors are shown inside it and nothing is lost
                $submitted = [
                    'title'       => $title,
                    'description' => $description,
                    'date'        => $date,
                    'priority'    => in_array($priority, ['low', 'medium', 'high'], true) ? $priority : 'medium',
                ];

                if ($action === 'add') {
                    $showAddModal = true;
                    $addForm      = $submitted;
                } elseif ($exists) {
                    $showEditModal = true;
                    $editForm      = $submitted;
                    $editId        = $id;
                }
            }
            break;

        case 'toggle':   // mark completed / pending
            if ($exists) {
                $current = $_SESSION['tasks'][$id]['status'];

                if ($current === 'completed') {
                    $_SESSION['tasks'][$id]['status']       = 'pending';
                    $_SESSION['tasks'][$id]['completed_at'] = null;
                } else {
                    // The browser sends its own local date so "completed late"
                    // matches the person's day, not the server's time zone
                    $completedOn = postString('completed_on');
                    $cd = DateTime::createFromFormat('Y-m-d', $completedOn);
                    if (!$cd || $cd->format('Y-m-d') !== $completedOn) {
                        $completedOn = date('Y-m-d');
                    }

                    $_SESSION['tasks'][$id]['status']       = 'completed';
                    $_SESSION['tasks'][$id]['completed_at'] = $completedOn;
                }
            }
            break;

        case 'trash':    // DELETE (move to Bin)
            if ($exists) {
                $_SESSION['tasks'][$id]['deleted']    = true;
                $_SESSION['tasks'][$id]['deleted_at'] = time();
                $_SESSION['flash'] = 'Task moved to Bin.';
            }
            break;

        case 'restore':  // take it back out of the Bin
            if ($exists) {
                $_SESSION['tasks'][$id]['deleted']    = false;
                $_SESSION['tasks'][$id]['deleted_at'] = null;
                $_SESSION['flash'] = 'Task restored successfully.';
            }
            break;

        case 'delete':   // DELETE permanently (only tasks that are already in the Bin)
            if ($exists && !empty($_SESSION['tasks'][$id]['deleted'])) {
                unset($_SESSION['tasks'][$id]);
            }
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

// One-time success message (shown as a toast, then forgotten)
$flash = $_SESSION['flash'] ?? '';
unset($_SESSION['flash']);
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <title>Task Manager</title>

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
            <h1 class="brand">
                <span class="brand-logo" aria-hidden="true">?</span>
                TaskaNa
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

            <h4 class="sidebar-title">Menu</h4>

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

                <!-- Empty Bin Button -->
            <button type="button" id="empty-bin-btn" class="empty-bin-action">
             <i class="fas fa-trash"></i> Empty Bin
            </button>

                    <!-- Sort Dropdown -->
                    <div class="sort-container">

                     <button id="sort-tasks-btn" type="button">
                       <i class="fas fa-sort"></i> Sort
                        <i class="fas fa-chevron-down"></i>
                    </button>

                      <div class="sort-dropdown" id="sort-dropdown">

                    <button type="button" data-sort="alphabetical" data-view="regular">
                    Alphabetical (A-Z)
                    </button>

                    <button type="button" data-sort="date" data-view="regular">
                    Due Date (Earliest to Previous)
                    </button>

        <button type="button" data-sort="priority" data-view="regular">
            Priority (High to Low)
        </button>

                    <button type="button" data-sort="alphabetical" data-view="bin">
                    Alphabetical (A-Z)
                    </button>

                    <button type="button" data-sort="deleted" data-view="bin">
                    Date Deleted (Earliest to Previous)
                    </button>

        </div>

                </div>

                </div>
            </section>

            <!-- Validation errors from PHP -->
            <?php if (!empty($errors) && !$showAddModal && !$showEditModal): ?>
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

                <div class="bin-notice" role="note">
                    <i class="fas fa-circle-info"></i>
                    <span>Deleted tasks can only be restored within 30 days. After 30 days they are permanently deleted.</span>
                </div>

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

        <?php if ($showAddModal && !empty($errors)): ?>
            <div class="error-list">
                <?php foreach ($errors as $error): ?>
                    <p><?= htmlspecialchars($error) ?></p>
                <?php endforeach; ?>
            </div>
        <?php endif; ?>

        <form id="add-task-form" method="POST" action="" novalidate>

            <div class="form-group form-group-full">
                <label for="task-title">Task Title</label>
                <input
                    type="text"
                    id="task-title"
                    name="task_title"
                    value="<?= htmlspecialchars($addForm['title']) ?>"
                    placeholder="What needs to get done?"
                    autocomplete="off"
                    required
                >
            </div>

            <div class="form-group">
                <label for="task-description">Description</label>
                <textarea
                    id="task-description"
                    name="task_description"
                    placeholder="Add some details..."
                ><?= htmlspecialchars($addForm['description']) ?></textarea>
            </div>

            <div class="form-group">
                <label for="task-date">Due Date</label>
                <input
                    type="date"
                    id="task-date"
                    name="task_date"
                    value="<?= htmlspecialchars($addForm['date']) ?>"
                >
            </div>

            <div class="form-group">
                <label for="task-priority">Priority</label>
                <select id="task-priority" name="task_priority">
                    <option value="low"<?= $addForm['priority'] === 'low' ? ' selected' : '' ?>>Low</option>
                    <option value="medium"<?= $addForm['priority'] === 'medium' ? ' selected' : '' ?>>Medium</option>
                    <option value="high"<?= $addForm['priority'] === 'high' ? ' selected' : '' ?>>High</option>
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


    <!-- EDIT TASK MODAL (same design as Create New Task) -->
    <section class="add-task-section<?= $showEditModal ? ' show' : '' ?>" id="editTaskModal">

    <div class="modal-overlay" id="edit-modal-overlay"></div>

    <div class="add-task-modal">

        <div class="modal-header">
            <div>
                <h3>
                    <i class="fas fa-pen-to-square"></i> Edit Task
                </h3>
            </div>

            <button type="button" id="closeEditModal" class="close-task-btn">
                <i class="fas fa-times"></i>
            </button>
        </div>

        <?php if ($showEditModal && !empty($errors)): ?>
            <div class="error-list">
                <?php foreach ($errors as $error): ?>
                    <p><?= htmlspecialchars($error) ?></p>
                <?php endforeach; ?>
            </div>
        <?php endif; ?>

        <form id="editTaskForm" method="POST" action="" novalidate>
            <input type="hidden" name="action" value="edit">
            <input type="hidden" name="id" id="editTaskId" value="<?= htmlspecialchars($editId) ?>">

            <div class="form-group form-group-full">
                <label for="editTaskTitle">Task Title</label>
                <input
                    type="text"
                    id="editTaskTitle"
                    name="task_title"
                    value="<?= htmlspecialchars($editForm['title']) ?>"
                    placeholder="What needs to get done?"
                    autocomplete="off"
                    required
                >
            </div>

            <div class="form-group">
                <label for="editTaskDescription">Description</label>
                <textarea
                    id="editTaskDescription"
                    name="task_description"
                    placeholder="Add some details..."
                ><?= htmlspecialchars($editForm['description']) ?></textarea>
            </div>

            <div class="form-group">
                <label for="editTaskDate">Due Date</label>
                <input
                    type="date"
                    id="editTaskDate"
                    name="task_date"
                    value="<?= htmlspecialchars($editForm['date']) ?>"
                >
            </div>

            <div class="form-group">
                <label for="editTaskPriority">Priority</label>
                <select id="editTaskPriority" name="task_priority">
                    <option value="low"<?= $editForm['priority'] === 'low' ? ' selected' : '' ?>>Low</option>
                    <option value="medium"<?= $editForm['priority'] === 'medium' ? ' selected' : '' ?>>Medium</option>
                    <option value="high"<?= $editForm['priority'] === 'high' ? ' selected' : '' ?>>High</option>
                </select>
            </div>

            <div class="form-buttons">
                <button type="button" id="cancelEdit">
                    Cancel
                </button>

                <button type="submit" id="saveEdit">
                    <i class="fas fa-check"></i> Save Changes
                </button>
            </div>
        </form>

    </div>

    </section>

    
    <!-- Hidden form used by script.js for toggle / trash / restore / delete / empty bin -->
    <form id="action-form" method="POST" action="" hidden>
        <input type="hidden" name="action" id="action-type">
        <input type="hidden" name="id" id="action-id">
        <input type="hidden" name="completed_on" id="action-completed-on">
    </form>
    
    <div class="app-dialog" id="app-dialog" role="alertdialog" aria-modal="true" aria-labelledby="dialog-message">
        <div class="app-dialog-overlay" id="dialog-overlay"></div>
        <div class="app-dialog-box">
            <div class="app-dialog-icon"><i id="dialog-icon" class="fas fa-circle-exclamation"></i></div>
            <p class="app-dialog-message" id="dialog-message"></p>
            <div class="app-dialog-actions">
                <button type="button" id="dialog-cancel" class="app-dialog-cancel">Cancel</button>
                <button type="button" id="dialog-ok">OK</button>
            </div>
        </div>
    </div>

    <!-- Toast notifications (script.js fills this in) -->
    <div class="toast-container" id="toast-container" aria-live="polite"
         data-message="<?= htmlspecialchars($flash) ?>"></div>

    <!-- External JavaScript -->
    <script src="script.js" defer></script>

</body>
</html>