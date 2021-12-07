// * Data Structure -> array of objects
/*
Events:
 - submit form 
 - button bubbles on hover
 - 
*/

document.addEventListener('DOMContentLoaded', (e) => {
    getBrewData();
})

function getBrewData() {
    fetch('https://api.openbrewerydb.org/breweries')
    .then(res => res.json())
    .then(data => {
        console.log(data);
    })
}