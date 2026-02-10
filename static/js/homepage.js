/**
 * SECTION 1: THEME & POPUP LOGIC
 * (Moved from your original homepage.html)
 */
function toggleTheme() {
    document.body.classList.toggle('light-mode');
    if (document.body.classList.contains('light-mode')) {
        localStorage.setItem('theme', 'light');
    } else {
        localStorage.setItem('theme', 'dark');
    }
}

function showTaskPopup() {
    document.getElementById("taskInputPopup").style.display = "block";
}

function closeTaskPopup() {
    document.getElementById("taskInputPopup").style.display = "none";
    document.getElementById("task_name").value = "";
}

function showDueDatePopupUI() {
    const taskName = document.getElementById("task_name").value;
    if (taskName.trim() === "") {
        alert("Please enter a task name first");
        return;
    }
    document.getElementById("taskInputPopup").style.display = "none";
    document.getElementById("dueDatePopup").style.display = "block";
}

function submitTaskWithDueDate() {
    document.getElementById("dueDatePopup").style.display = "none";
    document.getElementById("stepSetupPopup").style.display = "block";
}

function submitTaskWithoutDueDate() {
    document.getElementById("due_date").value = "";
    document.getElementById("dueDatePopup").style.display = "none";
    document.getElementById("stepSetupPopup").style.display = "block";
}

function closeStepSetupPopup() {
    document.getElementById("stepSetupPopup").style.display = "none";
    document.getElementById("taskForm").submit();
}

function addStepToList() {
    const stepDesc = document.getElementById("step_description").value;
    const difficulty = document.getElementById("difficulty").value;
    
    if (stepDesc.trim() !== "") {
        const stepList = document.getElementById("stepList");
        const listItem = document.createElement("li");
        
        let badgeClass = difficulty.toLowerCase();
        listItem.innerHTML = `<span class="step-text">${stepDesc}</span> <span class="step-badge ${badgeClass}">${difficulty}</span>`;
        stepList.appendChild(listItem);
        
        const stepInput = document.createElement("input");
        stepInput.type = "hidden";
        stepInput.name = "steps[]";
        stepInput.value = `${stepDesc}|${difficulty}`;
        document.getElementById("taskForm").appendChild(stepInput);
        
        document.getElementById("step_description").value = "";
    }
}

/**
 * SECTION 2: DATA LOADING
 * Grabs the prompts from the HTML data attribute to avoid linter errors.
 */
const promptContainer = document.getElementById('prompt-data');
const USER_PROMPTS = JSON.parse(promptContainer.getAttribute('data-prompts') || "[]");

/**
 * SECTION 3: COMIC DIALOGUE ROTATION
 * This handles the turn-by-turn logic for your NULL checks.
 */
document.addEventListener('DOMContentLoaded', () => {
    // We check if the USER_PROMPTS variable (from homepage.html) has items
    if (typeof USER_PROMPTS !== 'undefined' && USER_PROMPTS.length > 0) {
        const bubble = document.getElementById('speech-bubble');
        const textElement = document.getElementById('bubble-text');
        let currentPromptIndex = 0;

        // Make the bubble visible
        bubble.style.display = 'block';

        function rotateMessages() {
            // Set the text to the current prompt
            textElement.innerText = USER_PROMPTS[currentPromptIndex];
            
            // Move to the next prompt, or back to 0 if at the end
            currentPromptIndex = (currentPromptIndex + 1) % USER_PROMPTS.length;
        }

        // Run immediately once
        rotateMessages();

        // Change the message every 6 seconds
        setInterval(rotateMessages, 6000);
    }
});