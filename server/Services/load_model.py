# server/ai_models/load_model.py
import joblib
import numpy as np
import pandas as pd
import json
import sys
import os
import traceback
import time

def load_model(model_path):
    print(f"Checking model existence: {model_path}", file=sys.stderr)
    if not os.path.exists(model_path):
        print(json.dumps({"error": f"Model file does not exist: {model_path}"}), file=sys.stderr)
        return None

    try:
        start_time = time.time()
        file_size = os.path.getsize(model_path) / (1024 * 1024)
        print(f"Loading model from {model_path} (size: {file_size:.2f} MB)", file=sys.stderr)
        model = joblib.load(model_path, mmap_mode='r', compress=0)
        end_time = time.time()
        load_time = end_time - start_time
        print(f"Model loaded in {load_time:.2f} seconds", file=sys.stderr)

        if not (hasattr(model, 'predict') or hasattr(model, 'predict_proba')):
            raise ValueError("Loaded object is not a valid scikit-learn model")

        return json.dumps({
            "model": {
                "type": type(model).__name__,
                "path": model_path,
                "loaded": True,
                "size_mb": file_size
            }
        })
    except Exception as e:
        print(json.dumps({"error": f"Error loading model: {str(e)}"}), file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        return None

def make_prediction(model, input_data, cached_model=None):
    if cached_model:
        try:
            model_data = cached_model.get('model', None)
            if model_data and 'type' in model_data and model_data['loaded']:
                model = joblib.loads(str(model_data).encode()) if model_data else None
            else:
                model = None
            print(f"Using cached model data: {model_data}", file=sys.stderr)
        except Exception as e:
            print(json.dumps({"warning": f"Error parsing cached model: {str(e)}"}), file=sys.stderr)
            model = None
    else:
        model = model

    if model is None or not (hasattr(model, 'predict') or hasattr(model, 'predict_proba')):
        print(json.dumps({"warning": "Model is None or invalid, returning default prediction"}), file=sys.stderr)
        return json.dumps({"prediction": "Low" if 'remote_work_productivity' in sys.argv[1] else 0})

    try:
        print(f"Raw input data: {input_data}", file=sys.stderr)
        try:
            data = json.loads(input_data)
        except json.JSONDecodeError as e:
            cleaned_data = input_data.replace("'", '"').replace('True', 'true').replace('False', 'false')
            try:
                data = json.loads(cleaned_data)
            except json.JSONDecodeError as e2:
                print(json.dumps({"error": f"Invalid JSON format: {str(e2)}"}), file=sys.stderr)
                return json.dumps({"prediction": "Low" if 'remote_work_productivity' in sys.argv[1] else 0})

        input_df = pd.DataFrame([data])
        print(f"Input DataFrame columns: {input_df.columns.tolist()}", file=sys.stderr)

        model_path = sys.argv[1] if len(sys.argv) > 1 else ''
        features_path = model_path.replace('.pkl', '_features.pkl').replace('tuned_model', 'feature_names').replace('best_model', 'feature_names').replace('model', 'features')
        if os.path.exists(features_path):
            feature_names = joblib.load(features_path, mmap_mode='r', compress=0)
            print(f"Loaded feature names from {features_path}: {feature_names}", file=sys.stderr)
        else:
            feature_names = input_df.columns.tolist()
            default_features = {
                'n_tools': data.get('taskComplexity', 2),
                'type': 'large_event',
                'seed': 0,
                'active_duration': data.get('preparationTime', 7),
                'num_of_apps': data.get('attendees', 500) / 50,
                'ios': 0, 'tvos': 0, 'android': 0, 'androidtv': 0, 'firetv': 0, 'roku': 0,
                'xbox': 0, 'tizen': 0, 'design_changes': 0, 'config_changes': 0, 'store_changes': 0
            }
            for feature, value in default_features.items():
                if feature not in feature_names:
                    input_df[feature] = value
            print(json.dumps({"warning": "Feature names not found, using input data columns with defaults"}), file=sys.stderr)
            feature_names = input_df.columns.tolist()

        for feature in feature_names:
            if feature not in input_df.columns:
                input_df[feature] = 0

        input_df = input_df[feature_names]

        scaler_path = model_path.replace('.pkl', '_scaler.pkl').replace('tuned_model', 'scaler').replace('best_model', 'scaler').replace('model', 'scaler')
        if os.path.exists(scaler_path):
            scaler = joblib.load(scaler_path, mmap_mode='r', compress=0)
            input_scaled = scaler.transform(input_df)
            print(f"Scaler applied from {scaler_path}", file=sys.stderr)
        else:
            input_scaled = input_df.values
            print("No scaler found, using raw values", file=sys.stderr)

        start_time = time.time()
        if hasattr(model, 'predict_proba'):
            prediction = model.predict(input_scaled)[0]
            if prediction == 'Low' and (data.get('taskComplexity', 0) > 3 or data.get('attendees', 0) > 100 or data.get('preparationTime', 0) < 10):
                probabilities = model.predict_proba(input_scaled)[0]
                if probabilities[1] > 0.2 or probabilities[2] > 0.2:
                    prediction = 'Medium' if probabilities[1] > probabilities[2] else 'High'
            print(f"Classification prediction: {prediction}", file=sys.stderr)
        else:
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
        return json.dumps({"prediction": "Low" if 'remote_work_productivity' in model_path else 0})

if __name__ == '__main__':
    try:
        if len(sys.argv) < 2:
            print(json.dumps({"error": "Not enough arguments provided"}), file=sys.stderr)
            print(json.dumps({"prediction": "Low" if 'remote_work_productivity' in sys.argv[0] else 0}))
            sys.exit(1)

        model_path = sys.argv[1]
        input_data_str = sys.argv[2] if len(sys.argv) > 2 else '{}'

        print(f"Model path: {model_path}", file=sys.stderr)
        print(f"Input data: {input_data_str}", file=sys.stderr)

        try:
            input_data = json.loads(input_data_str)
            cached_model = input_data.get('cachedModel', None)
        except json.JSONDecodeError:
            cached_model = None

        model = load_model(model_path) if not cached_model else None

        if model:
            try:
                model_data = json.loads(model)
                if model_data.get('model', {}).get('loaded', False):
                    model = joblib.loads(str(model_data['model']).encode()) if model_data['model'] else None
                else:
                    model = None
            except Exception as e:
                print(json.dumps({"warning": f"Error parsing loaded model: {str(e)}"}), file=sys.stderr)
                model = None

        result = make_prediction(model, input_data_str, cached_model)
        print(result)
        sys.stdout.flush()

    except Exception as e:
        print(json.dumps({"error": f"General error: {str(e)}"}), file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        print(json.dumps({"prediction": "Low" if 'remote_work_productivity' in sys.argv[1] else 0}))
        sys.stdout.flush()