const aiServices = require('./server/services/aiservices');

// Test input
const testInput = {
    taskComplexity: 7,
    resourceAllocation: 5
};

// Test each prediction function
async function testPredictions() {
    try {
        console.log('Testing Remote Work Productivity prediction...');
        const productivity = await aiServices.predictRemoteWorkProductivity(testInput);
        console.log('Result:', productivity);

        console.log('\nTesting Taskbench prediction...');
        const taskbench = await aiServices.predictTaskbenchProductivity(testInput);
        console.log('Result:', taskbench);

        console.log('\nTesting Jira Task Complexity prediction...');
        const jira = await aiServices.predictJiraTaskComplexity(testInput);
        console.log('Result:', jira);

        console.log('\nTesting priority suggestion...');
        const priority = await aiServices.suggestPriority('This is an urgent task');
        console.log('Result:', priority);
    } catch (error) {
        console.error('Error testing predictions:', error);
    }
}

// Run the tests
testPredictions();