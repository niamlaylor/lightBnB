const properties = require('./json/properties.json');
const users = require('./json/users.json');
const { Pool } = require('pg');

const pool = new Pool({
  user: 'vagrant',
  password: '123',
  host: 'localhost',
  database: 'lightbnb'
});

/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function(email) {
  return pool
    .query(`SELECT * FROM users WHERE email LIKE $1`, [email])
    .then((user) => {
      if (!user.rows.length) {
        return null;
      }
      return Promise.resolve(user.rows[0]);
    })
    .catch((err) => {
      console.log(err);
    });
}
exports.getUserWithEmail = getUserWithEmail;

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function(id) {
  return pool
    .query(`SELECT * FROM users WHERE users.id = $1`, [id])
    .then((users) => {
      return Promise.resolve(users.rows[0]);
    })
}
exports.getUserWithId = getUserWithId;


/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser =  function(user) {
  return pool
    .query(`INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING *`, [user.name, user.password, user.email])
    .then((user) => {
      return Promise.resolve(user.rows[0]);
    })
}

exports.addUser = addUser;

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = function(guest_id, limit = 10) {
  return pool
    .query(`SELECT DISTINCT reservations.*, properties.*, AVG(property_reviews.rating) as average_rating
    FROM reservations
    JOIN properties ON properties.id = reservations.property_id
    JOIN property_reviews ON properties.id = property_reviews.property_id
    WHERE reservations.guest_id = $1
    GROUP BY properties.id, reservations.id
    ORDER BY reservations.start_date
    LIMIT $2`, [guest_id, limit])
    .then((reservations) => {
      return Promise.resolve(reservations.rows);
    })
}
exports.getAllReservations = getAllReservations;

/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */
// const getAllProperties = function(options, limit = 10) {
//   const limitedProperties = {};
//   for (let i = 1; i <= limit; i++) {
//     limitedProperties[i] = properties[i];
//   }
//   return Promise.resolve(limitedProperties);
// }

const getAllProperties = (options, limit = 10) => {
  const queryParams = [];
// Moved WHERE statement up into the default query for ease of filtering
  let queryString = `
  SELECT properties.*, title, cost_per_night, avg(property_reviews.rating) as average_rating
  FROM properties
  LEFT JOIN property_reviews ON properties.id = property_id
  WHERE title = title
  `;

  // if (options.city && options.minimum_price_per_night && options.maximum_price_per_night && options.minimum_rating) {
  //   queryParams.push(`%${options.city}%`);
  //   queryString += `WHERE properties.city LIKE $${queryParams.length} `;
  //   queryParams.push(`${options.minimum_price_per_night}`);
  //   queryString += `AND cost_per_night > $${queryParams.length} `;
  //   queryParams.push(`${options.maximum_price_per_night}`);
  //   queryString += `AND cost_per_night < $${queryParams.length} `;

  // }
  if (options.city) {
    queryParams.push(`%${options.city}%`);
    queryString += `AND city LIKE $${queryParams.length} `;
  } 
  if (options.minimum_price_per_night) {
    const minPriceCents = options.minimum_price_per_night * 100;
    queryParams.push(`${minPriceCents}`);
    queryString += `AND cost_per_night > $${queryParams.length} `;
  }
  if (options.maximum_price_per_night) {
    const maxPriceCents = options.maximum_price_per_night * 100;
    queryParams.push(`${maxPriceCents}`);
    queryString += `AND cost_per_night < $${queryParams.length} `;
  }
  if (options.owner_id) {
    queryParams.push(`${options.owner_id}`);
    queryString += `AND owner_id = $${queryParams.length} `;
  }

  queryString += `
  GROUP BY properties.id
  `
  // Add HAVING statement for the average rating
  if (options.minimum_rating) {
    queryParams.push(`${options.minimum_rating}`);
    queryString += `HAVING avg(property_reviews.rating) > $${queryParams.length} `;
  }
  queryParams.push(limit);
  queryString += `
  ORDER BY cost_per_night
  LIMIT $${queryParams.length};
  `;

  console.log(queryString, queryParams)

  return pool
    .query(queryString, queryParams)
    .then((properties) => {
      return Promise.resolve(properties.rows);
    })
    .catch((err) => {
      console.log(err.message);
    });
};

exports.getAllProperties = getAllProperties;


/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function(property) {
  // const propertyId = Object.keys(properties).length + 1;
  // property.id = propertyId;
  // properties[propertyId] = property;
  // return Promise.resolve(property);
  let queryParams = [];
  for (const parameter in property) {
    queryParams.push(property[parameter]);
  };

  let queryString = `
  INSERT INTO properties (title, description, number_of_bedrooms, number_of_bathrooms, parking_spaces, cost_per_night, thumbnail_photo_url, cover_photo_url, street, country, city, province, post_code, owner_id)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
  RETURNING *`;
  
  return pool
    .query(queryString, queryParams)
    .then((property) => {
      return Promise.resolve(property);
    })
}
exports.addProperty = addProperty;
