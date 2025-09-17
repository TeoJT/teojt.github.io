import os

def skies(path):
    for root, dirs, files in os.walk(path):
        skycount = 0
        treecount = 0
        hasGrass = False
        for file in files:
            if file.startswith("pixelrealm-sky"):
                skycount += 1
            elif file.startswith("pixelrealm-terrain_object"):
                treecount += 1
            elif file.startswith("pixelrealm-grass"):
                hasGrass = True
        with open(root+"/meta.txt", "w") as f:
            f.write(str(skycount)+"\n"+str(treecount))

        if (not hasGrass):
            print("WARNING  no grass in "+root)
        if (skycount == 0):
            print("WARNING  no sky in "+root)

# Specify the path to the top-level folder containing the hidden files
folder_path = os.path.dirname(os.path.abspath(__file__))

skies(folder_path)
