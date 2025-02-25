// aiService.js

function suggestPriority(description) {
    const lowPriorityKeywords = [
        'optional',
        'minor',
        'low',
        'not urgent',
        'later',
        'can be delayed',
        'can be done later',
        'not important'
    ];

    const highPriorityKeywords = [
        'urgent',
        'critical',
        'high',
        'important',
        'immediate',
        'asap',
        'priority'
    ];

    description = description.toLowerCase();

    // Check for high priority phrases
    if (highPriorityKeywords.some(keyword => description.includes(keyword))) {
        return 'High';
    }

    // Check for low priority phrases
    if (lowPriorityKeywords.some(keyword => description.includes(keyword))) {
        return 'Low';
    }

    return 'Medium'; // Default priority if no specific keywords are found
}

module.exports = {
    suggestPriority
};
