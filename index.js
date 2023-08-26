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
        let optPath = __dirname + '/cache/options.json';
        let ingPath = __dirname + '/cache/ingredients.json';
        let recPath = __dirname + '/cache/saved_recipes.json';
        let cachePath = __dirname + '/cache/recipe_cache.json';
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
                    await recipes(ingPath, recPath, cachePath, optPath);
                    break;
                }
                default: {
                    onCancel();
                    break;
                };
            };
        } else {
            await saveApiKey(optPath);
        }
    } catch (err) {
        console.log(err);
        onCancel(err);
    };
};

async function findByIngredient(iPath, rPath, rCachePath, optPath) {
    try {
        let data = JSON.parse(fs.readFileSync(iPath));
        let { k } = JSON.parse(fs.readFileSync(optPath));

        if (fs.existsSync(iPath)) {
            if (data.length > 0) {


                // const prompt = new MultiSelect({
                //     name: 'value',
                //     message: 'Select ingredients to use in search',
                //     limit: 10,
                //     choices: data.map(i => i[0].toUpperCase() + i.substr(1, i.length))
                // });

                // let searchQueryIngredients = await prompt.run();
                // let searchIngredientString = searchQueryIngredients.map(i => i.toLowerCase()).join(",+")

                // console.log(searchIngredientString);

                // const findByIngredients = (await (await fetch(`https://api.spoonacular.com/recipes/findByIngredients?ingredients=${searchIngredientString}`, {
                //     method: 'GET',
                //     headers: {
                //         "x-api-key": k
                //     }
                // })).json())

                let findByIngredients = JSON.parse(fs.readFileSync(__dirname + "/mockGetByIngredients.json"))

                let dir = await parseRecipeResultData(findByIngredients);


                await displayRecipeResults(dir, iPath, rPath, rCachePath, optPath)

                // await recipes(iPath, rPath, rCachePath, optPath);
            } else {
                console.log(red("No ingredients found... \n > Add them from the 'Ingredients' menu item. "));
                await recipes(iPath, rPath, rCachePath, optPath);
            }
        } else {
            console.log(red("No ingredients found... \n > Add them from the 'Ingredients' menu item. "));
            await recipes(iPath, rPath, rCachePath, optPath);
        }
    } catch (err) {
        onCancel(err);
    }
}

async function parseRecipeResultData(data) {
    return data.map(i => {
        return {
            [i.id]: {
                title: i.title,
                img: i.image,
                missedIngredientCount: i.missedIngredientCount,
                missedIngredients: i.missedIngredients.map(i => {
                    return {
                        name: i.name,
                        serving: i.original,
                        amount: i.amount + " " + i.unit
                    }
                }),
                likes: i.likes
            }
        }
    })
}
async function displayRecipeResults(dir, iPath, rPath, rCachePath, optPath) {
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
                name: key.title,
                hint: `⚠️ Need ${key.missedIngredientCount}: ` + "" + key.missedIngredients.map(i => i.name[0].toUpperCase() + i.name.substring(1, i.name.length)).join(", ")
            }
        })]
    }];

    let selectedRecipe = await prompt(parsedResults);
    let selectedRecipeName = selectedRecipe.recipe;

    if (selectedRecipeName.includes("Back")) {
        await recipes(iPath, rPath, rCachePath, optPath);
    } else {
        dir.map(i => {
            let key = i[Object.keys(i)[0]];
            if (key.title === selectedRecipeName) {
                console.log(`===============================`);
                console.log(`Recipe`);
                console.log(`===============================`);
                console.log(`   Name: ${key.title}`)
                console.log(`👍 Likes: ${key.likes}`)
                console.log(red("   Missing:"), key.missedIngredients.map(i => i.name[0].toUpperCase() + i.name.substring(1, i.name.length)).join(", "))
            }
        })

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
                console.log('viewed instructions');
                break;
            }
            case selectedRecipeOption.recipeOptions.includes("Back"): {
                await displayRecipeResults(dir, iPath, rPath, rCachePath, optPath);
                break;
            }
            default: {
                break;
            }
        }
    }
}

async function recipesUserSave() {

}

async function recipesCacheSave() {

}
async function recipes(iPath, rPath, rCachePath, optPath) {
    if (fs.existsSync(rPath)) {

        let data = JSON.parse(fs.readFileSync(rPath));

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
                await findByIngredient(iPath, rPath, rCachePath, optPath);
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
        fs.writeFileSync(rPath, JSON.stringify([]), "utf8");
        fs.writeFileSync(rCachePath, JSON.stringify([]), "utf8");
        console.log('File created for recipes and cache');
        await recipes(iPath, rPath, rCachePath, optPath);
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
        choices: ['🍞 Ingredients', '📝 Recipes', '⚙️ Setup', '❔ About',]
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
        await viewIngredients(path)
        await ingredients(path);
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

        noDupesArr = noDupesArr.map(i => i.toLowerCase())
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