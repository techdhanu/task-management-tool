const { PythonShell } = require('python-shell');
const path = require('path');

// Function to load models and make predictions with timeout
const makePrediction = (modelName, inputData) => {
    return new Promise((resolve, reject) => {
        try {
            let modelPath = path.join(__dirname, '..', 'ai_models', modelName);

            let options = {
                mode: 'text',
                pythonOptions: ['-u'],
                scriptPath: path.join(__dirname, '..', 'services'),
                args: [modelPath, JSON.stringify(inputData)]
            };

            // Add timeout to prevent hanging
            const timeout = setTimeout(() => {
                console.warn(`Python execution timed out for model: ${modelName}`);
                resolve(0); // Return default value on timeout
            }, 10000); // 10 second timeout

            PythonShell.run('load_model.py', options, (err, results) => {
                clearTimeout(timeout); // Clear the timeout

                if (err) {
                    console.error('Error running Python prediction:', err);
                    resolve(0); // Return default value in case of error
                } else {
                    // Parse the result or use default, ensure it's a number
                    try {
                        const result = results && results.length > 0 ? parseFloat(results[0]) : 0;
                        resolve(isNaN(result) ? 0 : result);
                    } catch (parseError) {
                        console.error('Error parsing Python result:', parseError);
                        resolve(0);
                    }
                }
            });
        } catch (error) {
            console.error('Error in makePrediction:', error);
            resolve(0); // Return default value in case of error
        }
    });
};

// Enhanced priority suggestion with more advanced text analysis
const suggestPriority = async (description, dueDate) => {
    // Add default return in case description is undefined
    if (!description) return 'Medium';

    const lowerDesc = description.toLowerCase();

    // High priority indicators
    const highPriorityTerms = ['urgent', 'critical', 'asap', 'emergency',
        'immediate', 'crucial', 'highest priority',
        'blocking', 'severe', 'security', 'outage',
        'bug', 'fix', 'error', 'crash'];

    // Medium priority indicators
    const mediumPriorityTerms = ['medium', 'moderate', 'important',
        'necessary', 'significant', 'soon',
        'this week', 'next sprint', 'update',
        'improve', 'enhance'];

    // Low priority indicators
    const lowPriorityTerms = ['low', 'minor', 'eventually', 'when possible',
        'nice to have', 'optional', 'would be nice',
        'backlog', 'future', 'if time permits',
        'consider', 'explore'];

    // Check for high priority indicators
    for (const term of highPriorityTerms) {
        if (lowerDesc.includes(term)) {
            return 'High';
        }
    }

    // Check for medium priority indicators
    for (const term of mediumPriorityTerms) {
        if (lowerDesc.includes(term)) {
            return 'Medium';
        }
    }

    // Check for low priority indicators
    for (const term of lowPriorityTerms) {
        if (lowerDesc.includes(term)) {
            return 'Low';
        }
    }

    // Consider due date proximity (if available)
    if (dueDate) {
        const today = new Date();
        const due = new Date(dueDate);
        const daysUntilDue = Math.ceil((due - today) / (1000 * 60 * 60 * 24));

        if (daysUntilDue <= 2) {
            return 'High'; // Very urgent due date
        } else if (daysUntilDue <= 7) {
            return 'Medium'; // Moderately urgent due date
        }
    }

    // Default to Low if no priority indicators found
    return 'Low';
};

// Estimate team size based on task complexity and priority
const estimateTeamSize = (taskComplexity, priority) => {
    // Default values if parameters are invalid
    if (!taskComplexity || isNaN(taskComplexity)) taskComplexity = 5;
    if (!priority) priority = 'Medium';

    // Base team size on complexity (1-10 scale)
    let baseTeamSize = Math.ceil(taskComplexity / 3);

    // Adjust for priority
    if (priority === 'High') {
        baseTeamSize += 1; // Add more resources for high priority tasks
    } else if (priority === 'Low') {
        baseTeamSize = Math.max(1, baseTeamSize - 1); // Reduce for low priority but ensure at least 1
    }

    // Ensure reasonable limits
    return Math.min(Math.max(baseTeamSize, 1), 5); // Between 1 and 5 team members
};

// Estimate time to complete task in days
const estimateCompletionTime = (taskComplexity, teamSize, priority) => {
    // Default values if parameters are invalid
    if (!taskComplexity || isNaN(taskComplexity)) taskComplexity = 5;
    if (!teamSize || isNaN(teamSize)) teamSize = 2;
    if (!priority) priority = 'Medium';

    // Base time estimate on complexity divided by team size
    let baseTimeEstimate = (taskComplexity * 1.5) / teamSize;

    // Adjust for priority
    if (priority === 'High') {
        baseTimeEstimate *= 0.8; // High priority tasks get more focus, completed faster
    } else if (priority === 'Low') {
        baseTimeEstimate *= 1.2; // Low priority tasks might take longer due to less focus
    }

    // Round to nearest half day and ensure reasonable minimum
    return Math.max(Math.round(baseTimeEstimate * 2) / 2, 0.5);
};

// Generate a task summary based on all predictions
const generateTaskSummary = async (title, description, dueDate, taskComplexity, resourceAllocation) => {
    try {
        // Default values for invalid inputs
        if (!taskComplexity || isNaN(taskComplexity)) taskComplexity = 5;
        if (!resourceAllocation || isNaN(resourceAllocation)) resourceAllocation = 3;

        // Get predictions
        const priority = await suggestPriority(description, dueDate);
        const teamSize = estimateTeamSize(taskComplexity, priority);
        const completionTime = estimateCompletionTime(taskComplexity, teamSize, priority);

        // Use Promise.allSettled to prevent one failed promise from blocking others
        const [productivityResult, taskbenchResult, jiraResult] = await Promise.allSettled([
            predictRemoteWorkProductivity({ taskComplexity, resourceAllocation }),
            predictTaskbenchProductivity({ taskComplexity, resourceAllocation }),
            predictJiraTaskComplexity({ taskComplexity, resourceAllocation })
        ]);

        // Extract values or use defaults
        const productivityScore = productivityResult.status === 'fulfilled' ? productivityResult.value : 0;
        const taskbenchScore = taskbenchResult.status === 'fulfilled' ? taskbenchResult.value : 0;
        const jiraComplexity = jiraResult.status === 'fulfilled' ? jiraResult.value : 0;

        // Generate a text summary
        return {
            priority,
            teamSize,
            estimatedDays: completionTime,
            productivityScore: productivityScore || 0,
            taskbenchScore: taskbenchScore || 0,
            jiraComplexity: jiraComplexity || 0,
            summary: `This ${priority.toLowerCase()} priority task has an estimated complexity of ${taskComplexity}/10. 
                     It's recommended to assign ${teamSize} team member${teamSize > 1 ? 's' : ''} 
                     with an estimated completion time of ${completionTime} day${completionTime > 1 ? 's' : ''}.
                     Task should be completed by ${new Date(dueDate).toDateString()}.`
        };
    } catch (error) {
        console.error('Error generating task summary:', error);
        return {
            priority: 'Medium',
            teamSize: 1,
            estimatedDays: 3,
            productivityScore: 0,
            taskbenchScore: 0,
            jiraComplexity: 0,
            summary: 'Unable to generate complete task analysis. Using default recommendations.'
        };
    }
};

// Predict remote work productivity
const predictRemoteWorkProductivity = async (inputData) => {
    try {
        const result = await makePrediction('tuned_model_cleaned_remote_work_productivity.pkl', inputData);
        return result;
    } catch (error) {
        console.error('Error predicting remote work productivity:', error);
        return 0;
    }
};

// Predict Taskbench productivity
const predictTaskbenchProductivity = async (inputData) => {
    try {
        const result = await makePrediction('best_model_cleaned_improved_taskbench.pkl', inputData);
        return result;
    } catch (error) {
        console.error('Error predicting taskbench productivity:', error);
        return 0;
    }
};

// Predict Jira task complexity
const predictJiraTaskComplexity = async (inputData) => {
    try {
        const result = await makePrediction('best_model_cleaned_jira_data.pkl', inputData);
        return result;
    } catch (error) {
        console.error('Error predicting Jira task complexity:', error);
        return 0;
    }
};

// Predict using merged model
const predictMergedModel = async (inputData) => {
    try {
        const result = await makePrediction('model_merged_file.pkl', inputData);
        return result;
    } catch (error) {
        console.error('Error predicting with merged model:', error);
        return 0;
    }
};

// Export functions
module.exports = {
    suggestPriority,
    predictRemoteWorkProductivity,
    predictTaskbenchProductivity,
    predictJiraTaskComplexity,
    predictMergedModel,
    estimateTeamSize,
    estimateCompletionTime,
    generateTaskSummary
};