// Global variables
const MAX_HISTORY = 30;
const PAUSE_SECONDS_FROM_END = 5;

let questions = {};
let currentQuestionId = null;
let askedQuestions = [];
let userAnswers = [];
let hasHeardAnswer = false;

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Load questions from JSON file
        const response = await fetch('questions.json');
        questions = await response.json();

        // Start with the first question
        nextQuestion();
    } catch (error) {
        console.error('Error loading questions:', error);
        document.getElementById('question-text').textContent = 'Error loading questions. Please refresh the page.';
    }
});

// Select a new question that hasn't been asked in the last 30 questions
function selectNewQuestion() {
    // Get all question IDs
    const allQuestionIds = Object.keys(questions);

    // Filter out questions that have been asked in the last 30 questions
    const availableQuestionIds = allQuestionIds.filter(id => !askedQuestions.includes(id));

    // If all questions have been asked in the last 30 questions, use the oldest one
    if (availableQuestionIds.length === 0) {
        return askedQuestions[0]; // Return the oldest asked question
    }

    // Randomly select a question from available questions
    const randomIndex = Math.floor(Math.random() * availableQuestionIds.length);
    return availableQuestionIds[randomIndex];
}

// Load and display the next question
function nextQuestion() {
    // Clear feedback and reset button states
    document.getElementById('feedback').textContent = '';
    document.getElementById('feedback').className = 'feedback';
    document.querySelectorAll('.option-btn').forEach(btn => {
        btn.className = 'option-btn';
        btn.disabled = false;
    });

    // Reset the hasHeardAnswer flag
    hasHeardAnswer = false;

    // Select a new question
    currentQuestionId = selectNewQuestion();

    // Add to asked questions and maintain history limit
    askedQuestions.push(currentQuestionId);
    if (askedQuestions.length > MAX_HISTORY) {
        askedQuestions.shift(); // Remove the oldest question
    }

    // Get the current question data
    const question = questions[currentQuestionId];

    // Update the UI with the question data
    document.getElementById('question-text').textContent = question.question;
    document.getElementById('option-a').textContent = `A: ${question.options.a}`;
    document.getElementById('option-b').textContent = `B: ${question.options.b}`;

    // Load the image
    const imageElement = document.getElementById('question-image');
    imageElement.src = `images/${currentQuestionId}.png`;
    imageElement.alt = `Question ${currentQuestionId} image`;

    // Load and play the audio
    const audioElement = document.getElementById('question-audio');
    audioElement.src = `audio/KNS ${currentQuestionId.padStart(3, '0')}.mp3`;

    // Remove any existing time-related event listeners
    audioElement.removeEventListener('timeupdate', pauseBeforeEnd);
    audioElement.removeEventListener('timeupdate', checkIfPastPausePoint);

    // Add an event listener to pause before the answer is told.
    audioElement.addEventListener('timeupdate', pauseBeforeEnd);

    // Add an event listener to detect if past the pause point
    audioElement.addEventListener('timeupdate', checkIfPastPausePoint);


    audioElement.load();
    audioElement.play().catch(error => {
        console.error('Error playing audio:', error);
    });
}

// Check the user's answer
function checkAnswer(selectedOption) {
    if (!currentQuestionId) return;

    const question = questions[currentQuestionId];
    const selectedCorrectOption = selectedOption === question.answer;

    // Determine if the answer should be counted as correct
    // If the user has heard the answer, don't count it as correct even if they selected the right option
    const isCorrect = selectedCorrectOption && !hasHeardAnswer;

    // Record the answer
    userAnswers.push({
        questionId: currentQuestionId,
        correct: isCorrect
    });

    // Maintain history limit
    if (userAnswers.length > MAX_HISTORY) {
        userAnswers.shift();
    }

    // Update the UI to show correct/incorrect/neutral
    const selectedButton = document.getElementById(`option-${selectedOption}`);

    if (hasHeardAnswer) {
        // User has heard the answer - neutral outcome
        selectedButton.classList.add('neutral');
        document.getElementById(`option-${question.answer}`).classList.add('correct');
        document.getElementById('feedback').textContent = 'You heard the answer - not counting this one!';
        document.getElementById('feedback').className = 'feedback neutral';
    } else if (selectedCorrectOption) {
        // User selected the correct answer without hearing the answer
        selectedButton.classList.add('correct');
        document.getElementById('feedback').textContent = 'Correct!';
        document.getElementById('feedback').className = 'feedback correct';
    } else {
        // User selected the wrong answer
        selectedButton.classList.add('incorrect');
        document.getElementById(`option-${question.answer}`).classList.add('correct');
        document.getElementById('feedback').textContent = 'Incorrect!';
        document.getElementById('feedback').className = 'feedback incorrect';
    }

    // Disable buttons after answer
    document.querySelectorAll('.option-btn').forEach(btn => {
        btn.disabled = true;
    });

    // Update the migratometer
    updateMigratometer();

    // Automatically go to the next question after a short delay
    setTimeout(nextQuestion, 1500); // 1.5 seconds delay
}

// Update the migrate-o-meter to show progress
function updateMigratometer() {
    const correctAnswers = userAnswers.filter(answer => answer.correct).length;

    // Calculate percentage based on 30 total questions instead of questions answered so far
    const percentage = (correctAnswers / 30) * 100;

    // Update the progress bar
    const progressBar = document.getElementById('progress-bar');
    progressBar.style.width = `${percentage}%`;

    // Change color if passing (21+ out of 30, which is 70%)
    const isPassing = correctAnswers >= 21;
    if (isPassing) {
        progressBar.classList.add('passing');
    } else {
        progressBar.classList.remove('passing');
    }

    // Update the score text - always show out of 30
    document.getElementById('score').textContent = `${correctAnswers}/30 answered correct`;
}

// Handle errors for image loading
function handleImageError() {
    const imageElement = document.getElementById('question-image');
    imageElement.src = 'images/placeholder.svg'; // Use the SVG placeholder
    console.error(`Image for question ${currentQuestionId} could not be loaded.`);
}

// Add error handler to image
document.getElementById('question-image').addEventListener('error', handleImageError);

// Function to pause before the answer is told.
function pauseBeforeEnd() {
    const audioElement = document.getElementById('question-audio');

    // margin is needed because the duration and currentTime are floats.
    const margin = 0.5

    if (audioElement.duration > 0 && audioElement.currentTime > 0 &&
        (audioElement.duration - audioElement.currentTime) < PAUSE_SECONDS_FROM_END + margin) {

        audioElement.pause();
        audioElement.removeEventListener('timeupdate', pauseBeforeEnd);
    }
}

function checkIfPastPausePoint() {
    const audioElement = document.getElementById('question-audio');
    if (audioElement.duration > 0 && audioElement.currentTime > 0 &&
        (audioElement.duration - audioElement.currentTime) < PAUSE_SECONDS_FROM_END) {

        hasHeardAnswer = true;
        audioElement.removeEventListener('timeupdate', checkIfPastPausePoint);
    }
}

