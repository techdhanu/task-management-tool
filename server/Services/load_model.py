# server/services/load_model.py
import joblib
import numpy as np
import pandas as pd
import json
import sys
import os
import traceback
import time

def load_model(model_path):
    # Check if model exists
    if not os.path.exists(model_path):
        print(json.dumps({"error": f"Model file does not exist: {model_path}"}), file=sys.stderr)
        return None

    try:
        start_time = time.time()  # Start timing
        # Load the model using joblib with memory-mapped mode and no compression for speed
        file_size = os.path.getsize(model_path) / (1024 * 1024)  # Size in MB
        print(f"Loading model from {model_path} (size: {file_size:.2f} MB)", file=sys.stderr)
        model = joblib.load(model_path, mmap_mode='r', compress=0)
        end_time = time.time()
        print(f"Model loaded in {end_time - start_time:.2f} seconds", file=sys.stderr)
        # Return the model as a JSON-serializable object
        return json.dumps({"model": str(model)})  # Convert model to string for JSON (simplified for caching)
    except Exception as e:
        print(json.dumps({"error": f"Error loading model: {str(e)}"}), file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        return None

def make_prediction(model, input_data, cached_model=None):
    # If cached model is provided, use it; otherwise, use the loaded model
    if cached_model:
        try:
            # Parse the cached model string back to a model object (simplified for this example)
            model_str = cached_model.get('model', None)
            if model_str:
                # Here, you'd typically reconstruct the model, but for simplicity, we'll assume it's a string representation
                model = joblib.loads(model_str.encode()) if model_str else None
            else:
                model = None
        except Exception as e:
            print(json.dumps({"warning": f"Error parsing cached model: {str(e)}"}), file=sys.stderr)
            model = None

    # If model is None, return a default value
    if model is None:
        print(json.dumps({"warning": "Model is None, returning default prediction"}), file=sys.stderr)
        return json.dumps({"prediction": "Low" if hasattr(model, 'predict_proba') else 0})

    try:
        # Debug: Print the raw input data
        print(f"Raw input data: {input_data}", file=sys.stderr)

        # Attempt to parse JSON, handling potential formatting issues
        try:
            data = json.loads(input_data)
        except json.JSONDecodeError as e:
            # Try to fix common formatting issues (e.g., single quotes to double quotes)
            cleaned_data = input_data.replace("'", '"').replace('True', 'true').replace('False', 'false')
            try:
                data = json.loads(cleaned_data)
            except json.JSONDecodeError as e2:
                print(json.dumps({"error": f"Invalid JSON format: {str(e2)}"}), file=sys.stderr)
                if hasattr(model, 'predict_proba'):
                    return json.dumps({"prediction": "Low"})
                return json.dumps({"prediction": 0})

        # Convert input data to DataFrame
        input_df = pd.DataFrame([data])

        # Load feature names (assume they are in the same directory as the model)
        features_path = model_path.replace('.pkl', '_features.pkl').replace('tuned_model', 'feature_names').replace('best_model', 'feature_names').replace('model', 'features')
        if os.path.exists(features_path):
            feature_names = joblib.load(features_path, mmap_mode='r', compress=0)
        else:
            feature_names = input_df.columns.tolist()
            # Add default Taskbench/Jira features if missing (fast defaults)
            if 'n_tools' not in feature_names: input_df['n_tools'] = data.get('taskComplexity', 2)  # Default based on complexity
            if 'type' not in feature_names: input_df['type'] = 'large_event'  # Default for large events
            if 'seed' not in feature_names: input_df['seed'] = 0  # Default
            if 'active_duration' not in feature_names: input_df['active_duration'] = data.get('preparationTime', 7)  # Use preparationTime
            if 'num_of_apps' not in feature_names: input_df['num_of_apps'] = data.get('attendees', 500) / 50  # Estimate apps based on attendees
            for f in ['ios', 'tvos', 'android', 'androidtv', 'firetv', 'roku', 'xbox', 'tizen', 'design_changes', 'config_changes', 'store_changes']:
                if f not in feature_names: input_df[f] = 0  # Default to 0

            print(json.dumps({"warning": "Feature names not found, using input data columns with defaults"}), file=sys.stderr)
            feature_names = input_df.columns.tolist()

        # Ensure all required features are present (fill missing with 0)
        for feature in feature_names:
            if feature not in input_df.columns:
                input_df[feature] = 0

        # Reorder columns to match feature_names
        input_df = input_df[feature_names]

        # Scale the input data (load scaler if available, or use raw values for speed)
        scaler_path = model_path.replace('.pkl', '_scaler.pkl').replace('tuned_model', 'scaler').replace('best_model', 'scaler').replace('model', 'scaler')
        if os.path.exists(scaler_path):
            scaler = joblib.load(scaler_path, mmap_mode='r', compress=0)
            input_scaled = scaler.transform(input_df)
        else:
            input_scaled = input_df.values  # Use raw values if no scaler for speed

        # Make prediction with timing (optimized for speed)
        start_time = time.time()
        if hasattr(model, 'predict_proba'):  # Classifier (e.g., RandomForestClassifier)
            prediction = model.predict(input_scaled)[0]
            if prediction == 'Low' and (data.get('taskComplexity', 0) > 3 or data.get('attendees', 0) > 100 or data.get('preparationTime', 0) < 10):
                probabilities = model.predict_proba(input_scaled)[0]
                if probabilities[1] > 0.2 or probabilities[2] > 0.2:
                    prediction = 'Medium' if probabilities[1] > probabilities[2] else 'High'
        else:  # Regressor (e.g., RandomForestRegressor)
            prediction = model.predict(input_scaled)[0]
            end_time = time.time()
            print(f"Regression prediction for {model_path}: {prediction} (took {end_time - start_time:.2f} seconds)", file=sys.stderr)
            return json.dumps({"prediction": float(prediction)})

        end_time = time.time()
        print(f"Classification prediction for {model_path}: {prediction} (took {end_time - start_time:.2f} seconds)", file=sys.stderr)
        return json.dumps({"prediction": prediction})

    except Exception as e:
        print(json.dumps({"error": f"Prediction failed: {str(e)}"}), file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        if hasattr(model, 'predict_proba'):
            return json.dumps({"prediction": "Low"})  # Default to 'Low' for classifiers
        return json.dumps({"prediction": 0})  # Default for regressors

if __name__ == '__main__':
    try:
        # Ensure we have the right number of arguments
        if len(sys.argv) < 3:
            print(json.dumps({"error": "Not enough arguments provided"}), file=sys.stderr)
            print(json.dumps({"prediction": "Low" if 'remote_work_productivity' in sys.argv[1] else 0}))
            sys.exit(1)

        model_path = sys.argv[1]
        input_data_str = sys.argv[2]

        print(f"Model path: {model_path}", file=sys.stderr)
        print(f"Input data: {input_data_str}", file=sys.stderr)

        # Check for cached model in input data
        try:
            input_data = json.loads(input_data_str)
            cached_model = input_data.get('cachedModel', None)
        except json.JSONDecodeError:
            cached_model = None

        model = load_model(model_path) if not cached_model else None
        result = make_prediction(model, input_data_str, cached_model)
        print(result)
        sys.stdout.flush()

    except Exception as e:
        print(json.dumps({"error": f"General error: {str(e)}"}), file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        print(json.dumps({"prediction": "Low" if 'remote_work_productivity' in sys.argv[1] else 0}))
        sys.stdout.flush()