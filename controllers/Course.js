const Course=require("../models/Course")
const Category=require("../models/Category")
const User = require("../models/User")
const user=require("../models/User")
const {uploadImageToClodinary}=require("../utils/imageUploder")
require("dotenv").config()

//create Course handler function
exports.createCourse=async(req,res)=>{
     try{
        //payload ke andar id daal rakhi h auth middleware ke andar thus we can get id from req.body
        //dusra tarika yeh hi ki hum db call karke id le sakte h
        const {courseName,courseDescription,whatYouWillLearn,price,category}=req.body

        //get thumbnail
        const thumbnail=req.files.thumbnailImage

        //validation
        if(!courseName || !courseDescription || !whatYouWillLearn ||!price ||!category ||!thumbnail){
            res.status(400).json({
                success:false,
                message:'All Fields are mandatory'
            })
        }

        // check for instructor : 
        const userId=req.user.id //payload ke andar se 
        const instructorDetails=await User.findById(userId)
        console.log("Instuctor Details : ",instructorDetails)

        if(!instructorDetails){
            res.status(404).json({
                success:false,
                message:"Instructor Details not found"
            })
        }

        //check given category is valid or not
        // req ki body se jo category milega vo course.js model mein object reference form mein h to hame id milegi
        const categoryDetails=Category.findById(category)// ye category id hoge 
        if(!categoryDetails){
            res.status(404).json({
                success:false,
                message:"Category Details not found"
            })
        }

        //upload image to cloudinary 
        const thumbnailImage=await uploadImageToClodinary(thumbnail,process.env.FOLDER_NAME) // here thumbnail is the file name and other is folder name

        //create an entry for new course
        const newCourse=await Course.create({
            courseName,courseDescription,instructor:instructorDetails._id,
            whatYouWillLearn,
            price,
            category:categoryDetails._id,
            thumbnail:thumbnailImage.secure_url
        })

        //add the new course to the user schema of instructor
        await User.findByIdAndUpdate({_id:instructorDetails._id},{
            $push:{
                courses:newCourse._id
            }
        },
    {new:true})

    //update the category Schema
    await Category.findByIdAndUpdate({
        _id:categoryDetails._id
    },
    {
        $push:{
            courses:newCourse._id
        }
    },
{
    new:true
})


    return res.status(200).json({
        success:true,
        message:"Course Created Successfully",
        data:newCourse
    })
     }
     catch(err){
        console.error(err)
        return res.status(500).json({
            success:false,
            message:'Failed to create course',
            err:err.message
        })
     }
}

//getAllCourses Handler Function

exports.getAllCourses=async(req,res)=>{
    try{
        const allCourses=await Course.find({})

        return res.status(200).json({
            success:true,
            message:"Data for all courses fetched successfully",
            data:allCourses
        })
    }
    catch(err){
        console.log(err)
        res.status(500).json({
            success:false,
            message:"Cannot fetch all Courses",
            error:err.message
        })
    }
}

//getCourseDetails
exports.getCourseDetails=async(req,res)=>{
    try{
        //get id
        const {courseId}=req.body
        //find cours details
        const courseDetails=await Course.find({_id:courseId}).populate(
            {
            path:"instructor",
            populate:{
                path:"additionalDetails"
            }
        })
        .populate("category")
        .populate("ratingAndReviews")
        .populate({
                path:"courseContent",
                populate:{
                    path:"subSection"
                }
    })
    .exec()

    //validation
    if(!courseDetails){
        return res.status(400).json({
            success:false,
            message:`Could not find the course with ${courseId}`
        })
    }

    return res.status(200).json({
        success:true,
        message:"Course Details fetched successfully",
        data:courseDetails
    })
    }
    catch(err){
        console.log(err)
        return res.status(500).json({
            success:false,
            message:err.message
        })
    }
}

exports.editCourse=async(req,res)=>{
    try{
        const {courseId}=req.body
        const updates=req.body
        const course=await Course.findById(courseId)

        if(!course){
            return res.status(404).json({
                success:false,
                message:"course does not found!",
            })
        }

        //if thumbnail image is found update it
        if(req.files){
            console.log("thumbnail update")
            const thumbnail=req.files.thumbnailImage
            const thumbnailImage=await uploadImageToClodinary(thumbnail,process.env.FOLDER_NAME)
            course.thumbnail=thumbnailImage.secure_url
        }

        //update only the fields that are present in the request body
        for(const key in updates){
            if(updates.hasOwnProperty(key)){
                if(key=="category"||key=="instructions"){
                    course[key]==JSON.parse(updates[key])
                } else{
                    course[key]=update[key]
                }
            }
        }

        await course.save()

        const updatedCourse=await Course.findOne({
            _id:courseId
        })
        .populate({
            path:"instructor",
            populate:{
                path:"additionalDetails"
            }
        })
        .populate("category")
        .populate("ratingAndReviews")
        .populate({
            path:"courseContent",
            populate:{
                path:"subSection"
            }
        })
        .exec()

        res.status(200).json({
            success:true,
            message:"Course updated successfully",
            data:updatedCourse
        })
    }
    catch(err){
        console.error(err)
        res.status(500).json({
            success:false,
            message:"Cannot edit course",
            error:err.message
        })
    }
}