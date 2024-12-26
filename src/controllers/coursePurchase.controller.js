import Stripe from "stripe"
import { CoursePurchase } from "../models/coursePurchase.model.js"
import { Course } from "../models/course.model.js"
import { Lecture } from "../models/lecture.model.js"
import { User } from "../models/user.model.js"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const createCheckoutSession = async (req, res) => {
  try {
    const { courseId } = req.body
    const course = await Course.findById(courseId)
    if (!course) {
      return res.status(404).json({ message: "Course not found" })
    }

    const newPurchase = new CoursePurchase({
      courseId: courseId,
      userId: req.user._id,
      amount: course.coursePrice,
      status: 'pending',
      paymentId: ''
    })

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'inr',
            product_data: {
              name: course.courseTitle,
              images: [course.courseThumbnail]
            },
            unit_amount: course.coursePrice * 100
          },
          quantity: 1
        }
      ],
      mode: 'payment',
      success_url: `${process.env.CLIENT_URL}/dashboard`,
      cancel_url: `${process.env.CLIENT_URL}/courses/${courseId}`,
      metadata: {
        courseId: courseId,
        userId: req.user._id,
      },
      shipping_address_collection: {
        allowed_countries: ['IN']
      }
    })

    if (!session.url) {
      return res
        .status(400)
        .json({ success: false, message: "Error while creating session" });
    }

    newPurchase.paymentId = session.id;
    await newPurchase.save()
    return res.status(200).json({
      success: true,
      url: session.url, // Return the Stripe checkout URL
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({ message: error.message })
  }
}

const stripeWebhook = async (req, res) => {
  let event;

  try {
    const payloadString = JSON.stringify(req.body, null, 2);
    const secret = process.env.WEBHOOK_ENDPOINT_SECRET;

    const header = stripe.webhooks.generateTestHeaderString({
      payload: payloadString,
      secret,
    })

    event = stripe.webhooks.constructEvent(payloadString, header, secret)
  } catch (error) {
    console.error("Webhook error:", error.message);
    return res.status(400).send(`Webhook error: ${error.message}`);
  }

  // handle the checkout.session.completed event
  if (event.type === 'checkout.session.completed') {

    console.log("check session complete is called");

    try {
      const session = event.data.object;

      const purchase = await CoursePurchase.findOne({ paymentId: session.id }).populate({ path: "courseId" })

      if (!purchase) {
        return res.status(404).json({ message: "Purchase not found" })
      }

      if (session.amount_total) {
        purchase.amount = session.amount_total / 100;
      }

      purchase.status = 'completed';

      if (purchase.courseId && purchase.courseId.lectures.length > 0) {
        await Lecture.updateMany(
          { _id: { $in: purchase.courseId.lectures } },
          { $set: { ispreview: true } }
        )
      }

      await purchase.save()

      // Update user's enrolledCourses
      await User.findByIdAndUpdate(
        purchase.userId,
        { $addToSet: { enrolledCourses: purchase.courseId._id } },
        { new: true }
      )

      await Course.findByIdAndUpdate(
        purchase.courseId._id,
        { $addToSet: { enrolledStudents: purchase.userId } },
        { new: true }
      )
    } catch (error) {
      console.error("Error handling event:", error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }
  res.status(200).send();
}

const getCourseDetailsWithPurchaseStatus = async (req, res) => {
  try {
    const { courseId } = req.params
    const course = await Course.findById(courseId).populate({ path: "creator" }).populate({ path: "lectures" })
    if (!course) {
      return res.status(404).json({ message: "Course not found" })
    }

    const purchase = await CoursePurchase.findOne({ courseId: courseId, userId: req.user._id })

    return res.status(200).json({ course, purchase: !!purchase })
  } catch (error) {
    console.log(error);

    res.status(500).json({ message: error.message })
  }
}

const getAllPurchaseCourses = async (req, res) => {
  try {
    const courses = await CoursePurchase.find({ userId: req.user._id }).populate({ path: "courseId" })

    if (!courses) {
      return res.status(404).json({
        courses: [],
      });
    }

    return res.status(200).json(courses)
  } catch (error) {
    console.log(error);

    res.status(500).json({ message: error.message })
  }
}

export {
  stripeWebhook,
  createCheckoutSession,getCourseDetailsWithPurchaseStatus, getAllPurchaseCourses
}