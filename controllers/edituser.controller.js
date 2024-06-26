import userModel from '../models/user.model.js'

import mongoose from 'mongoose'

import bcrypt from "bcryptjs";

//get all users
export const getUsers = async (req, res) => {
    const users = await userModel.find().sort({ createdAt: -1 });
    res.status(200).json(users);
}

//get a single user by id
export const getUser = async (req, res) => {
    const { id } = req.params

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(404).json({ error: 'No such user' })
    }

    const user = await userModel.findById(id)


    if (!user) {
        return res.status(404).json({ error: "No such user" })
    }

    res.status(200).json(user)
}

//get one user by username
export const getUserByUsername = async (req, res) => {
    const { username } = req.params;

    // Validate the input, assuming usernames have specific criteria
    if (!username) {
        return res.status(400).json({ error: 'Username is required' });
    }

    const user = await userModel.findOne({ username: username });

    if (!user) {
        return res.status(404).json({ error: 'No such user' });
    }

    res.status(200).json(user);
}



//create a new user
export const createUser = async (req, res) => {
    const { first_name, last_name, username, email, password } = req.body

    let emptyFields = []

    if (!first_name) {
        emptyFields.push('first_name')
    }
    if (!last_name) {
        emptyFields.push('last_name')
    }
    if (!username) {
        emptyFields.push('username')
    }
    if (!email) {
        emptyFields.push('email')
    }
    if (!password) {
        emptyFields.push('password')
    }
    if (emptyFields.length > 0) {
        return res.status(400).json({ error: "Please fill in all the fields.", emptyFields })
    }

    try {
        const user_id = req.user._id
        const user = await userModel.create({ first_name, last_name, username, email, password, user_id })
        res.status(200).json(user)
    } catch (error) {
        res.status(400).json({ error: error.message })
    }
}

//delete a user
export const deleteUser = async (req, res) => {
    const { id } = req.params

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(404).json({ error: 'No such user' })
    }

    const user = await userModel.findOneAndDelete({ _id: id })

    if (!user) {
        return res.status(400).json({ error: "No such user" })
    }

    res.status(200).json(user)

}

// Update a user
export const updateUser = async (req, res) => {
    const { id } = req.params;

    // Validate the ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(404).json({ error: "No such user" });
    }

    try {
        // Check if the request body contains 'role' and if it's set to "instructor" or "admin"
        if ("role" in req.body && (req.body.role.toLowerCase() === "instructor" || req.body.role.toLowerCase() === "admin")) {
          // If the role is "instructor" or "admin", set the courses array to empty
          req.body.courses = []; // Reset the courses array
        }
        if ('password' in req.body) {
            // Hash the password before updating
            req.body.password = await bcrypt.hash(req.body.password, 10);
        }
        
        // Attempt to update the user
        const user = await userModel.findOneAndUpdate({ _id: id }, { ...req.body }, { new: true, runValidators: true });

        // If no user is found or updated
        if (!user) {
            return res.status(404).json({ error: "No such user" });
        }

        // Respond with the updated user data (excluding sensitive data like password)
        const { password, ...updatedUserData } = user.toObject();
        res.status(200).json(updatedUserData);
    } catch (error) {
        // Catch and handle potential errors, such as validation errors
        res.status(400).json({ error: error.message });
    }
};


export const updateUserCourse = async (req,res) => {
    console.log("Inside controller")
    const { username } = req.params;
  const { courseId } = req.body;

//   if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(courseId)) {
//     return res.status(404).json({ error: "Invalid user or course ID" });
//   }

  try {
    
    // Find user and push the new course to their courses array
    const user = await userModel.findOneAndUpdate(
        { username: username },
        { $addToSet: { courses: { courseId: courseId } } }, // Use $addToSet to avoid duplicates
        { new: true, runValidators: true }
      );

    if (!user) {
      return res.status(404).json({ error: "No such user" });
    }

    // Respond with updated user data
    res.status(200).json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

export const checkEnrollment = async (req, res) => {
    try {
      const { username, courseId } = req.params;
      // Lookup the user and check if the courseId is in their enrolled courses
      const user = await userModel.findOne({ username, 'courses.courseId': courseId });
      const isEnrolled = !!user;
      res.status(200).json({ enrolled: isEnrolled });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };


  export const dropUserCourse = async (req, res) => {
    const { username } = req.params;
    const { courseId } = req.body; // Assume the courseId to drop is sent in the request body
  
    try {
      // Update the user document by pulling the course from their courses array
      const updatedUser = await userModel.findOneAndUpdate(
        { username: username },
        { $pull: { courses: { courseId: courseId } } },
        { new: true } // Return the updated document
      );
  
      if (!updatedUser) {
        return res.status(404).json({ error: "User not found or course not dropped" });
      }
  
      res.status(200).json(updatedUser);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  };
  
  

//verify admin password for updating user
export const verifyAdmin = async (req, res) => {
    try {
        const { username, password } = req.body;


        // Check if username and password are provided
        if (!password.trim()) {
            return res.status(400).json({ error: 'Password is required.' });
        }

        console.log(username, password)
        // Find the user by their email
        const adminUser = await userModel.findOne({ username });
        if (!adminUser) {
            return res.status(401).json({ error: 'Admin privileges required.' });
        }
        console.log(adminUser)


        const match = await bcrypt.compare(password, adminUser.password);

        if (!match) {
            return res.status(401).json({ error: "Incorrect password" });
        }

        console.log(`Admin verified: ${adminUser.username}`);

        res.status(200).json({ message: "Password verified." });
    } catch (error) {
        console.error("Admin verification error", error);
        res.status(500).json({ error: "An error occurred during admin verification." });
    }
}


export const checkUsername = async (req, res) => {
    try {
        const { username } = req.params;
        console.log(username)

        // Find the user by their username
        const user = await userModel.findOne({ username: username.toLowerCase() });

        if (user) {
            return res.status(409).json({ message: "Username already exists." });
        }
        // If no user is found, then the username is available
        res.status(200).json({ message: "Username is available." });
    } catch (error) {
        // Log the error and send back a generic error message
        console.error("Error checking username", error);
        res.status(500).json({ error: "An error occurred while checking the username." });
    }
}


