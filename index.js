import terminalImage from 'terminal-image';
import got from 'got';
import fs from "fs";
import { dirname } from 'path';
import { fileURLToPath } from 'url';
const cRequire = createRequire(import.meta.url);
import { createRequire } from "module";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import fetch from "node-fetch";
import pkg from 'kleur';
const { green, red, blue } = pkg;
const { prompt = prompt, Password, ArrayPrompt, Toggle, Select, Confirm, List, MultiSelect } = cRequire('enquirer');

async function main() {
    try {
        const paths = {
            optPath: __dirname + '/cache/options.json',
            ingPath: __dirname + '/cache/ingredients.json',
            recPath: __dirname + '/cache/saved_recipes.json',
            cachePath: __dirname + '/cache/recipe_cache.json'
        }

        let { optPath, ingPath } = paths;
        let keyPresent = await checkApiKey(optPath);

        if (keyPresent) {
            const menuOption = await mainMenu();
            switch (true) {
                case menuOption.includes("Setup"): {
                    await setup(optPath);
                    break;
                }
                case menuOption.includes("Ingredients"): {
                    await ingredients(ingPath);
                    break;
                }
                case menuOption.includes("Recipes"): {
                    await recipes(paths);
                    break;
                }
                default: {
                    onCancel();
                    break;
                };
            };

        } else {
            await saveApiKey(optPath);
        };
    } catch (err) {
        console.log(err);
        onCancel(err);
    };
};

async function findByIngredient(paths) {
    try {
        let { ingPath, recPath, cachePath, optPath } = paths
        let data = JSON.parse(fs.readFileSync(ingPath));
        let { k } = JSON.parse(fs.readFileSync(optPath));

        if (fs.existsSync(ingPath)) {
            if (data.length > 0) {

                const prompt = new MultiSelect({
                    name: 'value',
                    message: 'Select ingredients to use in search',
                    limit: 10,
                    choices: data.map(i => i[0].toUpperCase() + i.substr(1, i.length))
                });

                let searchQueryIngredients = await prompt.run();
                let searchIngredientString = searchQueryIngredients.map(i => i.toLowerCase()).join(",+")

                //? NETWORK REQUEST

                // const findByIngredients = (await (await fetch(`https://api.spoonacular.com/recipes/findByIngredients?ingredients=${searchIngredientString}`, {
                //     method: 'GET',
                //     headers: {
                //         "x-api-key": k
                //     }
                // })).json())

                //? LOCAL REQUEST

                let findByIngredients = JSON.parse(fs.readFileSync(__dirname + "/mockGetByIngredients.json"));

                let dir = await parseRecipeResultData(findByIngredients);

                await displayRecipeResults(dir, paths);

                // await recipes(iPath, rPath, rCachePath, optPath);
            } else {
                console.log(red("No ingredients found... \n > Add them from the 'Ingredients' menu item. "));
                await recipes(paths);
            }
        } else {
            console.log(red("No ingredients found... \n > Add them from the 'Ingredients' menu item. "));
            await recipes(paths);
        }
    } catch (err) {
        onCancel(err);
    }
};

async function showRecipe(selectedRecipeName, dir, paths) {
    try {
        dir.map(i => {
            let key = i[Object.keys(i)[0]];
            if (`🍜 ${key.title}` === selectedRecipeName) {
                console.log(`===============================`);
                console.log(`Recipe`);
                console.log(`===============================`);
                console.log(`🍜 Name: ${key.title}`)
                console.log(`👍 Likes: ${key.likes}`)
                console.log(red("⚠️ Missing:"), key.missedIngredients.map(i => i.name[0].toUpperCase() + i.name.substring(1, i.name.length)).join(", "))
            }
        });

        const selectedRecipeOptions = [{
            name: 'recipeOptions',
            type: 'select',
            message: 'Recipe Info',
            limit: 10,
            choices: [
                { name: '💾 Save' },
                { name: '📃 View Instructions' },
                { name: "⬅️ Go Back" },
            ]
        }]

        let selectedRecipeOption = await prompt(selectedRecipeOptions);

        switch (true) {
            case selectedRecipeOption.recipeOptions.includes("Save"): {
                console.log('recipe saved');
                break;
            }
            case selectedRecipeOption.recipeOptions.includes("View"): {
                await viewInstructions(dir, selectedRecipeName, paths);
                break;
            }
            case selectedRecipeOption.recipeOptions.includes("Back"): {
                await displayRecipeResults(dir, paths);
                break;
            }
            default: {
                break;
            }
        }
    } catch (err) {
        onCancel(err)
    }
}

async function parseRecipeResultData(data) {
    return data.map(i => {
        let servings = []
        return {
            [i.id]: {
                title: i.title,
                img: i.image,
                missedIngredientCount: i.missedIngredientCount,
                missedIngredients: i.missedIngredients.map(ing => {
                    servings.push(ing.original)
                    return {
                        name: ing.name,
                        serving: ing.original,
                        amount: ing.amount + " " + ing.unit
                    }
                }),
                usedIngredients: i.usedIngredients.map(uIng => {
                    servings.push(uIng.original)
                    return {
                        name: uIng.name,
                        serving: uIng.original,
                        amount: uIng.amount + " " + uIng.unit
                    }
                }),
                servings: servings,
                likes: i.likes
            }
        }
    })
};

async function displayRecipeResults(dir, paths) {

    const parsedResults = [{
        name: 'recipe',
        type: 'select',
        message: 'Select a recipe',
        limit: 10,
        choices: ["⬅️ Go Back", ...dir.map(i => {
            let key = i[Object.keys(i)[0]]
            // console.dir(i, { depth: null });
            // console.log("========================");
            return {
                name: `🍜 ${key.title}`,
                hint: `\n  ⚠️  Need ${key.missedIngredientCount}: ` + "" + key.missedIngredients.map(i => i.name[0].toUpperCase() + i.name.substring(1, i.name.length)).join(", ")
            };
        })]
    }];

    let selectedRecipe = await prompt(parsedResults);
    let selectedRecipeName = selectedRecipe.recipe;

    if (selectedRecipeName.includes("Back")) {
        await recipes(paths);
    } else {
        await showRecipe(selectedRecipeName, dir, paths)
    }
};

async function viewInstructions(dir, recipeName, paths) {
    try {
        let { cachePath, optPath } = paths;
        let apiKey = JSON.parse(fs.readFileSync(optPath)).k

        dir.map(async i => {
            let key = i[Object.keys(i)[0]];
            let id = Object.keys(i)[0]
            if (`🍜 ${key.title}` === recipeName) {

                if (fs.existsSync(cachePath)) {
                    let storedData = JSON.parse(fs.readFileSync(cachePath))

                    if (storedData[id]) {
                        await displayIngredientAmount(storedData[id])
                        await displaySteps(storedData[id].steps)
                    } else {
                        //? NETWORK REQUEST
                        // const results = await getRecipeInstructions(id, apiKey)
                        //? LOCAL DATA
                        const results = JSON.parse(fs.readFileSync('./mockGetDetailedInstructions.json'))

                        let storeObj;

                        let stepArr = []
                        results[0].steps.map(i => {
                            stepArr.push(i.step)
                            storeObj = { ...key, steps: stepArr }
                        })

                        storedData[id] = storeObj;

                        await recipeCacheSave(cachePath, storedData);

                        await displayIngredientAmount(storeObj)
                        await displaySteps(stepArr)
                    }
                    const goingBack = [{
                        name: '',
                        type: 'select',
                        message: '',
                        choices: ["⬅️ Go Back"]
                    }];

                    const goBack = await prompt(goingBack)

                    if (goBack) {
                        await showRecipe(recipeName, dir, paths)
                    }

                } else {
                    await recipeCacheSave(cachePath);
                    await viewInstructions(dir, recipeName, paths);
                }
            }
        })

    } catch (err) {
        onCancel(err);
    }
}

async function displayRecipeInformation() {

}

async function displaySteps(steps) {
    steps.map((i, idx) => {
        console.log(`${idx === 0 ? "\n" : ""} ${idx + 1}:`, i, "\n")
    });
};

async function displayIngredientAmount(storeObj) {
    console.log(" ");
    console.log("===============================");
    console.log("Ingredients");
    console.log("===============================");
    console.log(" ");
    storeObj.servings.map(i => {
        console.log(i);
    });
};

async function recipeUserSave() {
    //Save locally by user's request
};

async function recipeCacheSave(cachePath, storedData = {}) {
    fs.writeFileSync(cachePath, JSON.stringify(storedData), "utf8");
};

async function getRecipeInstructions(recipeId, k) {
    try {
        const results = await (await fetch(`https://api.spoonacular.com/recipes/${recipeId}/analyzedInstructions`, {
            method: 'GET',
            headers: {
                "x-api-key": k
            }
        })).json()

        return results;
    } catch (err) {
        onCancel(err);
    }
}

async function recipes(paths) {
    let { ingPath, recPath, cachePath, optPath } = paths
    if (fs.existsSync(recPath)) {

        let data = JSON.parse(fs.readFileSync(recPath));

        let choices = [
            '🔍 Find by ingredient/s',
            // '💾 Save',
            '📃 View Saved',
            '🗑️ Delete',
            "⬅️ Go Back"
        ].map(i => {
            if (data.length > 0) {
                return i;
            } else {
                return i != '🗑️ Delete' && i != '📃 View Saved' ? i : '';
            };
        }).filter(i => i);
        const option = new Select({
            name: 'option',
            message: 'Select an option',
            choices: choices
        });

        const choice = await option.run()
        switch (true) {
            case choice.includes("Find by"): {
                await findByIngredient(paths);
                break;
            }
            case choice.includes("View Saved"): {
                console.log('view saved');
                break;
            }
            // case choice.includes("Save"): {
            //     console.log('save a recipe');
            //     break;
            // }
            case choice.includes("Delete"): {
                console.log('delete');
                break;
            }
            case choice.includes("Back"): {
                main();
                break;
            }
            default: {
                break;
            }
        };
    } else {
        fs.writeFileSync(recPath, JSON.stringify([]), "utf8");
        fs.writeFileSync(cachePath, JSON.stringify([]), "utf8");
        console.log('File created for recipes and cache');
        await recipes(paths);
    }
};

async function ingredients(path) {
    if (fs.existsSync(path)) {

        let data = JSON.parse(fs.readFileSync(path));

        let choices = [
            '📃 View Saved',
            '➕ Add',
            '🗑️ Delete',
            "⬅️ Go Back"].map(i => {
                if (data.length > 0) {
                    return i
                } else {
                    return i != '🗑️ Delete' && i != '📃 View Saved' ? i : ''
                };
            }).filter(i => i);

        const option = new Select({
            name: 'option',
            message: 'Select an option',
            choices: choices
        });

        const choice = await option.run()
        switch (true) {
            case choice.includes("Add"): {
                await addIngredients(path);
                break;
            }
            case choice.includes("View"): {
                await viewIngredients(path);
                break;
            }
            case choice.includes("Delete"): {
                await delIngredients(path);
                break;
            }
            case choice.includes("Back"): {
                main();
                break;
            }
            default: {
                break;
            };
        }
    } else {
        addIngredients(path);
    };
};

async function viewIngredients(path) {
    if (fs.existsSync(path)) {
        let data = JSON.parse(fs.readFileSync(path)).sort();
        if (data.length > 0) {
            console.log("---------------------");
            data.forEach(i => console.log(i[0].toUpperCase() + i.substr(1, i.length)));
            console.log("");
        }
        await ingredients(path);
    } else {
        console.log("No ingredient/s found.");
    };
};

async function mainMenu() {
    const option = new Select({
        name: 'option',
        message: 'Select an option',
        choices: ['🍞 Ingredients', '📝 Recipes', '⚙️ Setup', '❔ About', '❌ Exit']
    });

    return option.run();
}

async function saveApiKey(path) {
    try {
        const auth = new Password({
            name: 'password',
            message: 'Please enter your api key from https://spoonacular.com/food-api/console#Profile. It will be saved locally.',
        });

        let apiInput = await auth.run();

        fs.writeFileSync(path, JSON.stringify({ k: apiInput }), "utf8");

        console.log(`Api Key Saved in: ${path.replace('/', "\\")} \n`);

        main();

    } catch (err) {
        console.log(err);
        onCancel(err);
    };
};

async function setup(path) {
    const choice = new Toggle({
        // name: 'question',
        message: 'Would you like to input a new api key?',
        enabled: 'Yes',
        disabled: 'No'
    });
    if (await choice.run()) {
        await saveApiKey(path);
    } else {
        await main();
    }
};

async function checkApiKey(path) {
    if (fs.existsSync(path)) {
        let data = JSON.parse(fs.readFileSync(path, "utf8"));
        if (data.k != '' && data.k !== undefined) {
            return true;
        } else {
            return false;
        }
    } else {
        return false;
    };
};

async function delIngredients(path) {

    if (fs.existsSync(path)) {
        let data = JSON.parse(fs.readFileSync(path))
        const prompt = new MultiSelect({
            name: 'value',
            message: 'Select ingredients to delete',
            limit: 10,
            choices: data.map(i => i[0].toUpperCase() + i.substr(1, i.length))
        });

        let toBeRemoved = await prompt.run();

        if (toBeRemoved.length > 0) {
            let newData = data.filter(i => !toBeRemoved.map(i => i.toLowerCase()).includes(i));
            fs.writeFileSync(path, JSON.stringify(newData), "utf8");
        };
        await viewIngredients(path);
    }
};

async function addIngredients(path) {

    const prompt = new List({
        name: 'keywords',
        message: 'List out the ingredients, comma-separated if multiple'
    });

    if (fs.existsSync(path)) {
        let oldData = JSON.parse(fs.readFileSync(path));
        let newData = await prompt.run();
        let tmpArr = [...oldData, ...newData];
        let noDupesArr = [...new Set([...tmpArr])].filter(n => n).sort();

        noDupesArr = noDupesArr.map(i => i.toLowerCase());
        fs.writeFileSync(path, JSON.stringify(noDupesArr), "utf8");
    } else {
        fs.writeFileSync(path, JSON.stringify(await prompt.run()), "utf8");
        console.log('File created for ingredients');
    };

    await viewIngredients(path);
};

async function confirmDelete() {
    const choice = new Confirm({
        name: 'question',
        message: 'Are you sure you want to delete?'
    });
    return choice.run();
};

function onCancel(err = '') {
    // console.clear();
    if (err != '') {
        console.log(red(`Exiting...due to ${err}`));
        process.exit();
    };
    console.log(err);
    // process.exit();
};

main();