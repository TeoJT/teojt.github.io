import os

def rename_hidden_files(path):
    for root, dirs, files in os.walk(path):
        for file in files:
            if file.startswith('.'):
                new_file = file[1:]  # Remove the period from the file name
                os.rename(os.path.join(root, file), os.path.join(root, new_file))
                print(f'Renamed: {file} to {new_file}')

# Specify the path to the top-level folder containing the hidden files
folder_path = os.path.dirname(os.path.abspath(__file__))

rename_hidden_files(folder_path)
