import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import Login from "./Screens/Login/index";
import Register from "./Screens/Register/index";
import ForgotPassword from "./Screens/ForgotPassword/index";
import Home from './Screens/Home/index'
import { createStackNavigator } from '@react-navigation/stack'
import Splash from './Screens/Splash/index'
import Chat from "./Screens/Chat/index";
import Messages from "./Screens/Home/Messages";
import UserDetails from "./Screens/UserDetails";
import EditProfile from "./Screens/EditProfile/index";
import Friends from "./Screens/Friends";
import SavedMessages from "./Screens/SavedMessages";
import GroupDetails from "./Screens/GroupDetails";
import NotificationSettings from "./Screens/NotificationSettings";

const Stack=createStackNavigator();

export default class Route extends React.Component{
   
render(){
  return <NavigationContainer>
  <Stack.Navigator initialRouteName="Splash">
    <Stack.Screen name="Login" component={Login} options={{ headerShown: false }}/>
    <Stack.Screen name="Register" component={Register} options={{ headerShown: false }}/>
    <Stack.Screen name="Forgot Password" component={ForgotPassword} options={{ headerShown: false }}/>
    <Stack.Screen name="Home" component={Home} options={{ headerShown: false }}/>
    <Stack.Screen name="Splash" component={Splash} options={{ headerShown: false }}/>
    <Stack.Screen name="Chat" component={Chat}/>
    <Stack.Screen name="Messages" component={Messages} />
    <Stack.Screen name="UserDetails" component={UserDetails}options={{ headerShown: false }}></Stack.Screen>
    <Stack.Screen name="EditProfile" component={EditProfile}options={{ headerShown: false }}></Stack.Screen>
    <Stack.Screen name="Friends" component={Friends}options={{ headerShown: false }}></Stack.Screen>
    <Stack.Screen name="SavedMessages" component={SavedMessages}options={{ headerShown: false }}></Stack.Screen>
    <Stack.Screen name="GroupDetails" component={GroupDetails}options={{ headerShown: false }}></Stack.Screen>
    <Stack.Screen name="NotificationSettings" component={NotificationSettings}options={{ headerShown: false }}></Stack.Screen>
  </Stack.Navigator>
</NavigationContainer>
}
}