// server/services/aiservices.js
const { PythonShell } = require('python-shell');
const path = require('path');
const fs = require('fs'); // Import fs module for file system operations

// Cache for loaded models (initialized during server startup)
let modelCache = {};

// Export modelCache for external access
module.exports.modelCache = modelCache;

const loadModels = async () => {
    const modelNames = [
        'tuned_model_cleaned_remote_work_productivity.pkl',
        'best_model_cleaned_improved_taskbench.pkl',
        'best_model_cleaned_jira_data.pkl'
    ];

    for (const modelName of modelNames) {
        try {
            const modelPath = path.join(__dirname, '..', 'ai_models', modelName);
            console.log(`Checking model path: ${modelPath}`); // Debug log
            if (!fs.existsSync(modelPath)) {
                console.error(`Model file not found: ${modelPath}`);
                modelCache[modelName] = { model: null, error: 'Model file not found' };
                continue;
            }

            const scriptPath = path.resolve(__dirname, '..', 'ai_models'); // Use resolve for absolute path
            const scriptFile = path.join(scriptPath, 'load_model.py');
            console.log(`Script path: ${scriptPath}, script file: ${scriptFile}`); // Debug log
            if (!fs.existsSync(scriptFile)) {
                console.error(`load_model.py not found at: ${scriptFile}`);
                modelCache[modelName] = { model: null, error: 'load_model.py not found' };
                continue;
            }

            const options = {
                mode: 'text',
                pythonOptions: ['-u'],
                scriptPath: scriptPath, // Absolute path to ai_models
                args: [modelPath, '{}'], // Empty input to load model only
                timeout: 5000 // 5-second timeout to ensure <6–7 seconds performance
            };

            console.log(`Loading model: ${modelName} from ${modelPath} with options:`, options); // Debug log
            const startTime = Date.now();
            const result = await new Promise((resolve, reject) => {
                PythonShell.run('load_model.py', options, (err, results) => {
                    if (err) {
                        console.error(`Error loading ${modelName}:`, err.stack || err.message); // Enhanced error logging
                        reject(err);
                    } else {
                        resolve(results ? results[0] : null);
                    }
                });
            });
            const endTime = Date.now();
            console.log(`Model ${modelName} loaded in ${endTime - startTime}ms`);

            try {
                const parsedResult = JSON.parse(result || '{}');
                if (parsedResult.model) {
                    modelCache[modelName] = { model: parsedResult.model, loadedAt: new Date() };
                    console.log(`Successfully loaded ${modelName}:`, parsedResult.model); // Debug log
                } else if (parsedResult.error) {
                    modelCache[modelName] = { model: null, error: parsedResult.error };
                    console.error(`Invalid model data for ${modelName}: ${parsedResult.error}`);
                } else {
                    modelCache[modelName] = { model: null, error: 'Invalid model data' };
                    console.error(`Invalid model data for ${modelName}, caching failed`);
                }
            } catch (parseError) {
                console.error(`Error parsing model data for ${modelName}:`, parseError.stack);
                modelCache[modelName] = { model: null, error: parseError.message };
            }
        } catch (error) {
            console.error(`Failed to load model ${modelName}:`, error.stack);
            modelCache[modelName] = { model: null, error: error.message };
        }
    }
    console.log('Model cache after loading:', modelCache);
};

// Function to make predictions using cached models (fast, with timeout)
const makePrediction = (modelName, inputData) => {
    return new Promise((resolve, reject) => {
        if (!modelCache[modelName] || !modelCache[modelName].model) {
            console.error(`Model ${modelName} not loaded or failed to load, using defaults`);
            if (modelName.includes('remote_work_productivity')) {
                resolve('Low'); // Default to 'Low' for classification
            } else {
                resolve(0); // Default to 0 for regression
            }
            return;
        }

        try {
            const modelPath = path.join(__dirname, '..', 'ai_models', modelName);
            const scriptPath = path.resolve(__dirname, '..', 'ai_models');
            const scriptFile = path.join(scriptPath, 'load_model.py');
            console.log(`Prediction script path: ${scriptPath}, script file: ${scriptFile}`); // Debug log
            if (!fs.existsSync(scriptFile)) {
                console.error(`load_model.py not found at: ${scriptFile}`);
                if (modelName.includes('remote_work_productivity')) {
                    resolve('Low');
                } else {
                    resolve(0);
                }
                return;
            }

            const options = {
                mode: 'text',
                pythonOptions: ['-u'],
                scriptPath: scriptPath, // Absolute path to ai_models
                args: [modelPath, JSON.stringify({ ...inputData, cachedModel: modelCache[modelName].model })],
                timeout: 5000 // 5-second timeout to ensure <6–7 seconds performance
            };

            console.log(`Prediction options for ${modelName}:`, options); // Debug log
            const startTime = Date.now();
            PythonShell.run('load_model.py', options, (err, results) => {
                const endTime = Date.now();
                console.log(`Prediction for ${modelName} completed in ${endTime - startTime}ms`);

                if (err) {
                    console.error(`Error predicting with ${modelName}:`, err.stack || err.message);
                    if (modelName.includes('remote_work_productivity')) {
                        resolve('Low'); // Default to 'Low' for classification errors
                    } else {
                        resolve(0); // Default to 0 for regression errors
                    }
                    reject(err);
                    return;
                }

                try {
                    const result = results && results.length > 0 ? results[0] : null;
                    if (!result) {
                        if (modelName.includes('remote_work_productivity')) {
                            resolve('Low');
                            console.warn(`No result for ${modelName}, falling back to 'Low'`);
                        } else {
                            resolve(0);
                            console.warn(`No result for ${modelName}, falling back to 0`);
                        }
                        return;
                    }
                    const parsedResult = JSON.parse(result);
                    if (parsedResult.error) {
                        console.error(`Prediction error for ${modelName}:`, parsedResult.error);
                        if (modelName.includes('remote_work_productivity')) {
                            resolve('Low');
                        } else {
                            resolve(0);
                        }
                        reject(new Error(parsedResult.error));
                    } else {
                        if (modelName.includes('remote_work_productivity')) {
                            resolve(parsedResult.prediction || 'Low'); // Ensure string for classification
                        } else {
                            resolve(parseFloat(parsedResult.prediction) || 0); // Ensure numeric for regression
                        }
                    }
                } catch (parseError) {
                    console.error(`Error parsing Python result for ${modelName}:`, parseError.stack);
                    if (modelName.includes('remote_work_productivity')) {
                        resolve('Low'); // Default to 'Low' for classification parsing errors
                    } else {
                        resolve(0); // Default to 0 for regression parsing errors
                    }
                    reject(parseError);
                }
            });
        } catch (error) {
            console.error(`Error in makePrediction for ${modelName}:`, error.stack);
            if (modelName.includes('remote_work_productivity')) {
                resolve('Low'); // Default to 'Low' for classification errors
            } else {
                resolve(0); // Default to 0 for regression errors
            }
            reject(error);
        }
    });
};

// Enhanced priority suggestion with more advanced text analysis (fast, no Python)
const suggestPriority = async (description, dueDate) => {
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
        'consider', 'explore', 'basic', 'simple', 'easy'];

    for (const term of highPriorityTerms) if (lowerDesc.includes(term)) return 'High';
    for (const term of mediumPriorityTerms) if (lowerDesc.includes(term)) return 'Medium';
    for (const term of lowPriorityTerms) if (lowerDesc.includes(term)) return 'Low';

    if (dueDate) {
        const today = new Date();
        const due = new Date(dueDate);
        const daysUntilDue = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
        if (daysUntilDue <= 2) return 'High';
        if (daysUntilDue <= 7) return 'Medium';
    }

    return 'Low'; // Default to Low (more conservative)
};

// Estimate team size based on task complexity and priority (fast, no Python)
const estimateTeamSize = (taskComplexity, priority) => {
    if (!taskComplexity || isNaN(taskComplexity)) taskComplexity = 5;
    if (!priority) priority = 'Medium';

    let baseTeamSize = Math.ceil(taskComplexity / 3);
    if (priority === 'High') baseTeamSize += 1;
    else if (priority === 'Low') baseTeamSize = Math.max(1, baseTeamSize - 1);

    return Math.min(Math.max(baseTeamSize, 1), 5); // Between 1 and 5 team members
};

// Estimate time to complete task in days (fast, no Python)
const estimateCompletionTime = (taskComplexity, teamSize, priority) => {
    if (!taskComplexity || isNaN(taskComplexity)) taskComplexity = 5;
    if (!teamSize || isNaN(teamSize)) teamSize = 2;
    if (!priority) priority = 'Medium';

    let multiplier = taskComplexity < 3 ? 1.0 : 1.5;
    let baseTimeEstimate = (taskComplexity * multiplier) / teamSize;

    if (priority === 'High') baseTimeEstimate *= 0.8;
    else if (priority === 'Low') baseTimeEstimate *= 1.2;

    return Math.max(Math.min(Math.round(baseTimeEstimate * 2) / 2, 5), 0.5); // Cap at 5 days, minimum 0.5
};

// Generate a task summary based on predictions (fast, uses cached models)
const generateTaskSummary = async (title, description, dueDate, taskComplexity, resourceAllocation) => {
    try {
        if (!taskComplexity || isNaN(taskComplexity)) taskComplexity = 5;
        if (!resourceAllocation || isNaN(resourceAllocation)) resourceAllocation = 3;

        const baseInput = {
            taskComplexity,
            resourceAllocation,
            Hours_Worked_Per_Week: 40,
            Employment_Type: 'Remote'
        };

        const startTime = Date.now();
        const [productivity, taskbench, jira] = await Promise.all([
            predictRemoteWorkProductivity(baseInput),
            predictTaskbenchProductivity(baseInput),
            predictJiraTaskComplexity(baseInput)
        ]);
        const endTime = Date.now();
        console.log(`AI predictions completed in ${endTime - startTime}ms`);

        const priority = await suggestPriority(description, dueDate);
        const teamSize = estimateTeamSize(taskComplexity, priority);
        const estimatedDays = estimateCompletionTime(taskComplexity, teamSize, priority);

        return {
            priority,
            teamSize,
            estimatedDays,
            productivityPrediction: productivity, // String (e.g., 'Low', 'Medium', 'High')
            taskbenchPrediction: taskbench, // Numeric
            jiraTaskComplexity: jira, // Numeric
            summary: `This ${priority.toLowerCase()} priority task has an estimated complexity of ${taskComplexity}/10. 
                     It's recommended to assign ${teamSize} team member${teamSize > 1 ? 's' : ''} 
                     with an estimated completion time of ${estimatedDays} day${estimatedDays > 1 ? 's' : ''}.
                     Task should be completed by ${new Date(dueDate).toDateString()}. Productivity is ${productivity.toLowerCase()}.`
        };
    } catch (error) {
        console.error('Error generating task summary:', error.stack);
        return {
            priority: 'Medium',
            teamSize: 1,
            estimatedDays: 1,
            productivityPrediction: 'Low', // Default to 'Low' for conservative prediction
            taskbenchPrediction: 0,
            jiraTaskComplexity: 0,
            summary: 'Unable to generate complete task analysis. Using default recommendations.'
        };
    }
};

// Predict remote work productivity (classification, fast with cached model)
const predictRemoteWorkProductivity = async (inputData) => {
    try {
        const startTime = Date.now();
        const result = await makePrediction('tuned_model_cleaned_remote_work_productivity.pkl', inputData);
        console.log(`Remote work productivity prediction completed in ${Date.now() - startTime}ms`);
        return result || 'Low'; // Ensure string for classification, default to 'Low'
    } catch (error) {
        console.error('Error predicting remote work productivity:', error.stack);
        return 'Low'; // Default to 'Low' for classification errors
    }
};

// Predict Taskbench productivity (regression, fast with cached model)
const predictTaskbenchProductivity = async (inputData) => {
    try {
        const startTime = Date.now();
        const result = await makePrediction('best_model_cleaned_improved_taskbench.pkl', inputData);
        console.log(`Taskbench productivity prediction completed in ${Date.now() - startTime}ms`);
        return result !== null && !isNaN(result) ? parseFloat(result) : 0; // Ensure numeric, default to 0
    } catch (error) {
        console.error('Error predicting taskbench productivity:', error.stack);
        return 0;
    }
};

// Predict Jira task complexity (regression, fast with cached model)
const predictJiraTaskComplexity = async (inputData) => {
    try {
        const startTime = Date.now();
        const result = await makePrediction('best_model_cleaned_jira_data.pkl', inputData);
        console.log(`Jira task complexity prediction completed in ${Date.now() - startTime}ms`);
        return result !== null && !isNaN(result) ? parseFloat(result) : 0; // Ensure numeric, default to 0
    } catch (error) {
        console.error('Error predicting Jira task complexity:', error.stack);
        return 0;
    }
};

// Predict using merged model (regression, fast with cached model) - optional
const predictMergedModel = async (inputData) => {
    try {
        const startTime = Date.now();
        const result = await makePrediction('model_merged_file.pkl', inputData);
        console.log(`Merged model prediction completed in ${Date.now() - startTime}ms`);
        return result !== null && !isNaN(result) ? parseFloat(result) : 0; // Ensure numeric, default to 0
    } catch (error) {
        console.error('Error predicting with merged model:', error.stack);
        return 0;
    }
};

// Export functions
module.exports = {
    loadModels, // Export for server.js to load models at startup
    suggestPriority,
    predictRemoteWorkProductivity,
    predictTaskbenchProductivity,
    predictJiraTaskComplexity,
    predictMergedModel,
    estimateTeamSize,
    estimateCompletionTime,
    generateTaskSummary
};