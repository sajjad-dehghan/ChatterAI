# ChatterAI

An intent-classification chatbot for **Persian** text. It uses a Bag-of-Words neural network or an Embedding + LSTM model, and when neither model finds a matching intent it can fall back to ChatGPT. A command-line menu lets you build the intent dataset, train a model and chat with it.

## Features

- **Two intent classifiers, built with TensorFlow/Keras:**
  - **Bag of Words:** a dense network (128 → 64 → softmax, with dropout) trained with SGD on binary bag-of-words vectors.
  - **Embedding + LSTM:** a Keras `Tokenizer`, padded sequences (length 20), a 30-dimension `Embedding`, an `LSTM(256)` layer and a softmax output, trained with Adam.
- **Persian text preprocessing** with [hazm](https://github.com/roshan-research/hazm): standard and informal normalization, sentence and word tokenization, and lemmatization.
- **Confidence threshold:** an intent is used only if its predicted probability is above 0.20. The bot then replies with a random response from that intent.
- **ChatGPT fallback (optional):** if no intent passes the threshold, the message is sent to `gpt-3.5-turbo` through the legacy `openai` 0.28 SDK. If that call fails, the bot replies with a fixed Persian message saying no suitable answer was found.
- **Dataset editor** (CLI) for intent JSON files: create a file, add tags, add patterns and responses, and view them.
- **CSV labeling helper:** go through a `user`/`operator` conversation CSV one row at a time and assign each user message to a tag. Your position is saved, so you can resume later.
- **Included data and models:** sample intent files (`bag`, `weight`, `food`) with their trained `.h5` models and pickled vocabularies and tokenizers.

## Requirements

- Python 3.8–3.10 (TensorFlow 2.10 and pandas 2.0.3 require these versions)
- The dependencies in `requirements.txt`: `hazm`, `tensorflow`, `pandas`, `openai==0.28.0`, `numpy`, `scipy`

## Getting Started

```bash
git clone https://github.com/sedwna/ChatterAI.git
cd ChatterAI
pip install -r requirements.txt
cd src          # the app reads and writes data using ../ paths, so start it from src/
python main.py
```

### ChatGPT fallback (optional)

`src/chatgpt.py` contains a placeholder key (`openai.api_key = "####"`). To turn the fallback on, put your own OpenAI API key there in your local copy, and don't commit it. Without a key, the bot still answers every message that matches an intent.

## Usage

When the app starts, it asks for the name of an intent file in `json_file/`, without the `.json` extension (for example `bag`). If the file doesn't exist, it offers to create it. Then choose an option from the menu:

| Option | Action |
| --- | --- |
| `1` | List the tags |
| `2` | Add a tag |
| `3` | Add responses to a tag |
| `4` | Add patterns to a tag |
| `5` | Show a tag's patterns |
| `6` | Show a tag's responses |
| `8` | Label messages from `csv_file/<name>.csv` into tags |
| `9` | Train a model (`1` = Bag of Words, `2` = LSTM) |
| `10` | Chat with the bot (`1` = Bag of Words, `2` = LSTM) |
| `-1` | Exit |

When you train on `<name>.json`, the app saves:

- `chat_bot_model/<name>_model.h5`
- `pkl_file/<name>_words.pkl` and `pkl_file/<name>_classes.pkl`
- `pkl_file/<name>_tkn.pkl` (LSTM model only)

To chat, pick the same model type you trained on that file. The included files are set up like this: `bag` uses Bag of Words, while `weight` and `food` use LSTM.

### Intent file format

```json
{
  "intents": [
    {
      "tag": "greeting",
      "patterns": ["سلام", "سلام وقت شما بخیر"],
      "responses": ["سلام", "سلام چطور میتونم کمکتون کنم؟"]
    }
  ]
}
```

## Project Structure

```
ChatterAI/
├── src/
│   ├── main.py        # CLI menu entry point
│   ├── app.py         # Intent JSON editor and CSV labeling helper
│   ├── nlp.py         # hazm-based normalization, tokenization and lemmatization
│   ├── training.py    # Bag-of-Words and Embedding+LSTM trainers
│   ├── chatbot.py     # Intent prediction, response selection and chat loop
│   └── chatgpt.py     # Optional ChatGPT fallback (openai 0.28)
├── json_file/         # Intent datasets: bag.json, weight.json, food.json
├── chat_bot_model/    # Trained Keras models (.h5)
├── pkl_file/          # Pickled vocabularies, classes and tokenizers
├── csv_file/counter/  # Resume positions for the CSV labeling helper
└── requirements.txt
```

## Tech Stack

- Python
- TensorFlow / Keras (Dense and LSTM models)
- hazm (Persian NLP)
- NumPy, pandas
- OpenAI Python SDK 0.28 (optional fallback)
