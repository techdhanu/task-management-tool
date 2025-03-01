import sys
import os
import joblib
import json
import traceback

def load_model(model_path):
    # Check if model exists
    if not os.path.exists(model_path):
        print("Model file does not exist:", model_path, file=sys.stderr)
        return None

    try:
        # Load the model using joblib
        model = joblib.load(model_path)
        return model
    except Exception as e:
        print(f"Error loading model: {str(e)}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        return None

def make_prediction(model, input_data):
    # If model is None, return a default value
    if model is None:
        return 0

    try:
        # Convert input data to the expected format for the model
        input_values = list(input_data.values())  # Extract values from the input dictionary

        # Print debug info
        print(f"Input values: {input_values}", file=sys.stderr)

        # Check if the model is fitted (this is a basic check)
        if hasattr(model, "predict"):
            # Force input as 2D array for scikit-learn
            import numpy as np
            input_array = np.array(input_values).reshape(1, -1)
            prediction = model.predict(input_array)
            return float(prediction[0])  # Ensure we're returning a float
        else:
            print("Model does not have predict method", file=sys.stderr)
            return 0
    except Exception as e:
        print(f"Error making prediction: {str(e)}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        return 0

if __name__ == '__main__':
    try:
        # Ensure we have the right number of arguments
        if len(sys.argv) < 3:
            print("Not enough arguments provided", file=sys.stderr)
            print(0)
            sys.exit(1)

        model_path = sys.argv[1]  # Model path passed from Node.js
        input_data_str = sys.argv[2]  # Input data passed from Node.js

        # Debug info
        print(f"Model path: {model_path}", file=sys.stderr)
        print(f"Input data: {input_data_str}", file=sys.stderr)

        # Parse the input data
        input_data = json.loads(input_data_str)

        # Load the model
        model = load_model(model_path)

        # Make the prediction
        result = make_prediction(model, input_data)

        # Output the result as plain number
        print(result)
        sys.stdout.flush()  # Make sure to flush stdout

    except Exception as e:
        print(f"General error: {str(e)}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        print(0)  # Return a default value
        sys.stdout.flush()  # Make sure to flush stdout