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

const breweryURL = 'https://api.openbrewerydb.org/breweries';

const newBreweryForm = document.querySelector('#new-brewery-form');
const newName = document.querySelector('#new-name');
const newBreweryType = document.querySelector('#new-brewery-type');
const newStreet = document.querySelector('#new-street');
const newCity = document.querySelector('#new-city');
const newState = document.querySelector('#new-state');
const newPostal = document.querySelector('#new-postal-code');
const newCountry = document.querySelector('#new-country');
const newPhone = document.querySelector('#new-phone');
const newWebsite = document.querySelector('#new-website-url');

function getBrewData() {
    fetch(breweryURL)
    .then(res => res.json())
    .then(data => {
        console.log(data);
    })
}

function postBrewData(breweryObj) {
    const postObj = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(breweryObj)
    }
    fetch(breweryURL, postObj)
    .then(res => res.json())
    .then(newBrewery => {
        console.log(newBrewery);
    })
}

// Event Listeners
newBreweryForm.addEventListener('submit', handleSubmit)

// Event Handlers
function handleSubmit(e) {
    e.preventDefault();
    const breweryObj = {
        name: newName.value,
        brewery_type: newBreweryType.value,
        street: newStreet.value,
        city: newCity.value,
        state: newState.value,
        postal_code: newPostal.value,
        country: newCountry.value,
        phone: newPhone.value,
        website_url: newWebsite.value,
    };
    postBrewData(breweryObj);
    newBreweryForm.reset();
}