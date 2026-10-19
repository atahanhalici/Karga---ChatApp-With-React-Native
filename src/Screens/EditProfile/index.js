import React, { useState, useEffect } from 'react';
import { DATABASE_URL } from '../../config';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Dimensions, ActivityIndicator, Modal, TouchableWithoutFeedback ,TextInput,Alert} from 'react-native';
import firebase from '@react-native-firebase/app';
import database from '@react-native-firebase/database';
import * as ImagePicker from 'react-native-image-picker';
import ImageCropPicker from 'react-native-image-crop-picker';
import { format } from 'date-fns';
import { useRoute, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import storage from '@react-native-firebase/storage';
import LinearGradient from 'react-native-linear-gradient';
import debounce from 'lodash/debounce';

const EditProfile = () => {
    const route = useRoute();
    const navigation = useNavigation();
    const [user, setUser] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);
    const userId = firebase.auth().currentUser.uid;
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [userName, setUserName] = useState('');
    const [bio, setBio] = useState('');
    const [isValidating, setIsValidating] = useState(false);
    const [isUsernameValid, setIsUsernameValid] = useState(null); 
    const [isControl, setIsControl] = useState(null); 
    const [expanded, setExpanded] = useState(false);
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showOldPassword, setShowOldPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [passwordError, setPasswordError] = useState('');
    const [transferred, setTransferred] = useState(0);

    useEffect(() => {
        const userRef = firebase.app().database(DATABASE_URL).ref(`/users/${userId}`);
        userRef.on('value', snapshot => {
            const userData = snapshot.val();
            setUser(userData);
            setUserName(userData?.userName || '');
            setBio(userData?.bio || '');
        });

        // Cleanup on unmount
        return () => userRef.off();
    }, [userId]);


    const validatePasswords = (newPassword, confirmPassword) => {
        if (newPassword.length < 8) {
            return 'Şifre en az 8 karakter uzunluğunda olmalı.';
        } else if (!/[A-Z]/.test(newPassword)) {
            return 'Şifre en az bir büyük harf içermeli.';
        } else if (!/[0-9]/.test(newPassword)) {
            return 'Şifre en az bir sayı içermeli.';
        } else if (newPassword !== confirmPassword) {
            return 'Yeni şifre ve onay şifresi uyuşmuyor.';
        } else {
            return '';
        }
    };

    const handleNewPasswordChange = (text) => {
        setNewPassword(text);
        const error = validatePasswords(text, confirmPassword);
        setPasswordError(error);
    };

    const handleConfirmPasswordChange = (text) => {
        setConfirmPassword(text);
        const error = validatePasswords(newPassword, text);
        setPasswordError(error);
    };
    if (!user) {
        return (
            <View style={styles.indicator}>
                <ActivityIndicator size="large" color="#FF8400" />
            </View>
        );
    }
    const handleImagePress = () => {
        setModalVisible(true);
    };

    const formatDate = (timestamp) => {
        const date = new Date(timestamp);
        return format(date, 'dd MMMM yyyy');
    };
    const handleEditPress = () => {
        setEditModalVisible(true);
    };

    const selectImage = () => {
        ImageCropPicker.openPicker({
            width: 300,
            height: 300,
            cropping: true,
        }).then(image => {
            uploadImage(image.path);
            setEditModalVisible(false);
        }).catch(error => {
            console.log('ImagePicker Error: ', error);
            setEditModalVisible(false);
        });
    };
    
    const takePhoto = () => {
        ImageCropPicker.openCamera({
            width: 300,
            height: 300,
            cropping: true,
        }).then(image => {
            uploadImage(image.path);
            setEditModalVisible(false);
        }).catch(error => {
            console.log('ImagePicker Error: ', error);
            setEditModalVisible(false);
        });
    };

    const uploadImage = async (uri) => {
        if (!uri) {
            console.error('No URI provided for the image');
            setEditModalVisible(false);
            return;
        }
    
        const uploadUri = uri;
        const filename = `${userId}_pp.jpg`;  // Consistent naming convention using userId
        const folderPath = 'profile_pictures';
        const filePath = `${folderPath}/${filename}`;
        
        setEditModalVisible(false);
        setUploading(true);
        setTransferred(0);
        
        // Delete the old profile picture if it exists
        if (user && user.picture && user.picture.includes(user.id)) {
            const oldPictureRef = storage().refFromURL(user.picture);
            try {
                await oldPictureRef.delete();
                console.log('Old profile picture deleted successfully');
            } catch (error) {
                console.error('Error deleting old profile picture:', error);
            }
        }
    
        const task = storage()
            .ref(filePath)
            .putFile(uploadUri);
    
        // Set transferred state
        task.on('state_changed', snapshot => {
            setTransferred(
                Math.round(snapshot.bytesTransferred / snapshot.totalBytes) * 100
            );
        });
    
        try {
            await task;
    
            const url = await storage().ref(filePath).getDownloadURL();
            setUser(prevState => ({ ...prevState, picture: url }));
            firebase.app().database(DATABASE_URL).ref(`/users/${userId}`).update({
                picture: url,
            });
    
        } catch (e) {
            console.error(e);
        }
        Alert.alert(
            "Success",
            "Your profile photo has been successfully changed",
            [
              
                {
                    text: "OK",
                    onPress: () => {
                        
                    }
                }
            ],
           
        );
        setUploading(false);
        setEditModalVisible(false);
    };
    const handleUsernameChange = (text) => {
        setIsControl(true);
        setUserName(text);
        debouncedValidation(text);
    };
    
    const debouncedValidation = debounce((text) => {
        if (text !== user?.userName && !isControl) {
            validateUsername(text);
        } else {
            setIsUsernameValid(null);
        }
    }, 500);
    const sleep = (ms) => {
        return new Promise(resolve => setTimeout(resolve, ms));
    };
    const validateUsername = async (text) => {
        setIsValidating(true); 
        setIsUsernameValid(null);
        await sleep(500);
        const usersRef = firebase.app().database(DATABASE_URL).ref(`/users`);
        const snapshot = await usersRef.once('value');
        const users = snapshot.val();
        
    
        let isUnique = true;
        for (const key in users) {
            if (users[key].userName === text) {
                isUnique = false;
                break;
            }
        }
    setIsControl(false);
        setIsUsernameValid(isUnique);
        setIsValidating(false);
    };


    const handlePasswordPanelClose = () => {
        
        
        
        if (expanded && (oldPassword.length!=0 || newPassword.length!=0 || confirmPassword.length!=0)){
            // Eğer expanded true ise, panel kapanacak demektir. Bu durumda kullanıcıya uyarı göster.
            Alert.alert(
                "Warning",
                "Closing the panel will discard any changes you made to the password. Are you sure you want to continue?",
                [
                    {
                        text: "Cancel",
                        onPress: () => console.log("Cancel Pressed"), // İptal tuşuna basıldı
                        style: "cancel"
                    },
                    {
                        text: "OK",
                        onPress: () => {
                            // Eğer kullanıcı onay verdiyse expanded state'ini false yaparak paneli kapat.
                            setExpanded(false);
                            // Şifre değişikliği state'lerini sıfırlayabilirsiniz
                            setOldPassword('');
                            setNewPassword('');
                            setConfirmPassword('');
                            setShowConfirmPassword(false);
                            setShowNewPassword(false);
                            setShowOldPassword(false);
                        }
                    }
                ],
                { cancelable: false }
            );
        }else if(expanded){
            setExpanded(false);
        } else {
            // Panel açık değilse, expanded state'ini true yaparak paneli açın.
            setExpanded(true);
        }
    };
    const save = async () => {
        const userRef = firebase.app().database(DATABASE_URL).ref(`/users/${userId}`);
    
        if (isUsernameValid) {
            Alert.alert(
                "Warning",
                "This username is already taken",
                [
                    {
                        text: "OK",
                        onPress: () => {}
                    }
                ],
            );
        } else {
            try {
                if (expanded && oldPassword && newPassword && passwordError.length === 0) {
                    const userr = firebase.auth().currentUser;
                    
                    if (userr && userr.email) {
                        const credential = firebase.auth.EmailAuthProvider.credential(userr.email, oldPassword);
                        try {
                            await userr.reauthenticateWithCredential(credential);
                            try {
                                await userr.updatePassword(newPassword);
                                Alert.alert(
                                    "Success",
                                    "Password updated successfully",
                                    [
                                        {
                                            text: "OK",
                                            onPress: () => {navigation.goBack()}
                                        }
                                    ],
                                );
                                console.log('Password updated successfully');
                            } catch (error) {
                                Alert.alert(
                                    "Error",
                                    "Error updating password. Please try again.",
                                    [
                                        {
                                            text: "OK",
                                            onPress: () => {}
                                        }
                                    ],
                                );
                                console.error('Error updating password:', error);
                            }
                        } catch (error) {
                            if (error.code === 'auth/invalid-credential') {
                                Alert.alert(
                                    "Error",
                                    "The supplied auth credential is incorrect, malformed or has expired. Please try again.",
                                    [
                                        {
                                            text: "OK",
                                            onPress: () => {}
                                        }
                                    ],
                                );
                            } else {
                                Alert.alert(
                                    "Error",
                                    "Error reauthenticating. Please try again.",
                                    [
                                        {
                                            text: "OK",
                                            onPress: () => {}
                                        }
                                    ],
                                );
                            }
                            console.error('Error reauthenticating:', error);
                        }
                    } else {
                        Alert.alert(
                            "Error",
                            "User not authenticated or email not available.",
                            [
                                {
                                    text: "OK",
                                    onPress: () => {}
                                }
                            ],
                        );
                        console.error('User not authenticated or email not available:', userr);
                    }
                }
    
                if (userName !== user.userName || bio !== user.bio) {
                    let updates = {};
                    if (userName !== user.userName) updates.userName = userName;
                    if (bio !== user.bio) updates.bio = bio;
    
                    await userRef.update(updates);
                    Alert.alert(
                        "Success",
                        "Data updated successfully",
                        [
                            {
                                text: "OK",
                                onPress: () => {navigation.goBack()}
                            }
                        ],
                    );
                    console.log('Data updated successfully');
                }
    
            } catch (error) {
                Alert.alert(
                    "Error",
                    "Error updating data. Please try again.",
                    [
                        {
                            text: "OK",
                            onPress: () => {}
                        }
                    ],
                );
                console.error('Error updating data:', error);
            }
        }
    }
    
    
    
    return (

        <LinearGradient
        style={styles.background}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.8, y: 0 }}
        colors={['#FF8400', '#FFA500']}
    >
        <View style={{ marginHorizontal: 15, marginVertical: 20 }}>
            <View style={[styles.header]}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={25} color="white" />
        </TouchableOpacity>
            <View style={{flex:1}}></View>
            <Image style={{width:35,height:35,marginRight:10}} source={require('../../../assets/images/logo_icon.png')}></Image>
                <Text style={styles.title}>Karga</Text>
                
            </View>
        </View>
        <View style={{
            backgroundColor: 'white',
            flex: 1,
            borderTopRightRadius: 30,
            borderTopLeftRadius: 30,
            alignItems: 'center',
            paddingTop: 20,
        }}>
        
        <ScrollView contentContainerStyle={styles.scrollContainer}>
            <View style={styles.contentContainer}>
            <View style={styles.profileContainer}>
    <View style={styles.profilePictureWrapper}>
    <TouchableOpacity onPress={handleImagePress}>
                                    <Image source={{ uri: user.picture }} style={styles.profilePicture} />
                                </TouchableOpacity>
        <TouchableOpacity style={styles.editButton} onPress={handleEditPress}>
            <Icon name="pencil-alt" size={20} color="#fff" />
        </TouchableOpacity>
    </View>
</View>
                              
            </View>
            <Text style={styles.label}>Username</Text>
<View style={[styles.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
<TextInput
    style={[styles.textInput, { flex: 1 }]}
    placeholder="Enter your username"
    placeholderTextColor="#FF8400"
    value={userName}
    onChangeText={handleUsernameChange}
    maxLength={20}
/>
        {userName.length > 15 && (
            <Text style={[styles.charCount, userName.length >= 20 ? styles.charCountRed : styles.charCountYellow]}>
                {userName.length}/20
            </Text>
        )}
    {isValidating ? (
        <ActivityIndicator size="small" color="#FF8400" style={{ marginLeft: 10 }} />
    ) : (
        isUsernameValid !== null && (
            <Icon
                name={isUsernameValid ? "check-circle" : "times-circle"}
                size={20}
                color={isUsernameValid ? "green" : "red"}
                style={{ marginLeft: 10 }}
            />
        )
    )}
</View>

<Text style={styles.label}>Bio</Text>
                    <View style={[styles.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
                        <TextInput
                            style={[styles.textInput, { flex: 1 }]}
                            placeholder="Enter your bio"
                            placeholderTextColor="#FF8400"
                            value={bio}
                            onChangeText={setBio}
                            maxLength={70}
                            multiline={true}
                            
                            />
                            {bio.length > 60 && (
                                <Text style={[styles.charCount, bio.length >= 70 ? styles.charCountRed : styles.charCountYellow]}>
                                    {bio.length}/70
                                </Text>
                            )}
                    </View>
                   
                    <TouchableOpacity style={styles.mediaButton} onPress={handlePasswordPanelClose}>
                        <Text style={styles.mediaButtonText}>Change Password</Text>
                        <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color="#FF8400" />
                    </TouchableOpacity>


                {expanded && (
                    <View style={{borderRadius:20,alignItems:'center', borderColor:"#FF8400",borderWidth: 1,width:Dimensions.get('window').width - 30}}>
                        <View style={{height:15}}/>
                        <Text style={[styles.label,{marginLeft:15}]}>Old Password</Text>
                        <View style={[styles.input,{width:Dimensions.get('window').width - 50}]}>
                    
                     <TextInput
                                        style={[styles.textInput,{width:Dimensions.get('window').width - 50} ]}
                                        placeholder="Old Password"
                                        placeholderTextColor="#FF8400"
                                        secureTextEntry={!showOldPassword}
                                        value={oldPassword}
                                        onChangeText={setOldPassword}
                                        
                                    />
                                      <TouchableOpacity style={{position:'absolute', right:15, top:15}}onPress={() => setShowOldPassword(!showOldPassword)}>
                                    <Icon name={showOldPassword ? 'eye-slash' : 'eye'} size={20} color="grey" />
                                </TouchableOpacity>
                                  </View>
                                    <Text style={[styles.label,{marginLeft:15}]}>New Password</Text>
                                    <View style={[styles.input,{width:Dimensions.get('window').width - 50}]}>
                                    <TextInput
                                       style={[styles.textInput, {width:Dimensions.get('window').width - 50}]}
                                        placeholder="New Password"
                                        placeholderTextColor="#FF8400"
                                        secureTextEntry={!showNewPassword}
                                        value={newPassword}
                                        onChangeText={(text)=>{handleNewPasswordChange(text)}}
                                    />
                                    <TouchableOpacity style={{position:'absolute', right:15, top:15}} onPress={() => setShowNewPassword(!showNewPassword)}>
                                    <Icon name={showNewPassword ? 'eye-slash' : 'eye'} size={20} color="grey" />
                                </TouchableOpacity>
                                    </View>
                                    <Text style={[styles.label,{marginLeft:15}]}>Confirm New Password</Text>
                                    <View style={[styles.input,{width:Dimensions.get('window').width - 50}]}>
                                    <TextInput
                                        style={[styles.textInput, {width:Dimensions.get('window').width - 50}]}
                                        placeholder="Confirm New Password"
                                        placeholderTextColor="#FF8400"
                                        secureTextEntry={!showConfirmPassword}
                                        value={confirmPassword}
                                        onChangeText={(text)=>{handleConfirmPasswordChange(text)}}
                                    /><TouchableOpacity style={{position:'absolute', right:15, top:15}} onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                                    <Icon name={showConfirmPassword ? 'eye-slash' : 'eye'} size={20} color="grey" />
                                </TouchableOpacity></View>
                                {passwordError ? <Text style={{ color: 'red', marginTop: 10 }}>{passwordError}</Text> : null}
                                    </View>)}
                                     <TouchableOpacity style={styles.createButton} onPress={()=>{save()}}>
                        <Text style={styles.createButtonText}>Save</Text>
                    </TouchableOpacity>
        </ScrollView>
        <Modal
                visible={modalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setModalVisible(false)}
            >
                <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
                    <View style={styles.modalBackground}>
                        <TouchableWithoutFeedback>
                            <View style={styles.modalContainer}>
                                <Image source={{ uri: user.picture }} style={styles.modalImage} />
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
            <Modal
    visible={editModalVisible}
    transparent={true}
    animationType="slide"
    onRequestClose={() => setEditModalVisible(false)}
>
    <TouchableWithoutFeedback onPress={() => setEditModalVisible(false)}>
        <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
                <View style={styles.editModalContainer}>
                    <TouchableOpacity style={styles.modalOption} onPress={takePhoto}>
                        <Text style={styles.modalOptionText}>Take Photo</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.modalOption} onPress={selectImage}>
                        <Text style={styles.modalOptionText}>Choose from Library</Text>
                    </TouchableOpacity>
                </View>
            </TouchableWithoutFeedback>
        </View>
    </TouchableWithoutFeedback>
</Modal>
<Modal
                    visible={modalVisible}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setModalVisible(false)}
                >
                    <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
                        <View style={styles.modalBackground}>
                            <TouchableWithoutFeedback>
                                <View style={styles.modalContainer}>
                                    <Image source={{ uri: user.picture }} style={styles.modalImage} />
                                </View>
                            </TouchableWithoutFeedback>
                        </View>
                    </TouchableWithoutFeedback>
                </Modal>
            {uploading && (
                <Modal transparent={true} animationType="none">
                    <View style={styles.uploadingContainer}>
                        <ActivityIndicator size="large" color="#FF8400" />
                        <Text style={styles.uploadingText}>New Profile Photo Uploading</Text>
                    </View>
                </Modal>
            )}
           
        </View>
        </LinearGradient>

    );
};
const { width, height } = Dimensions.get('window');
const modalSize = Math.min(width, height) * 0.8;
const styles = StyleSheet.create({
    createButton: {
        marginVertical: 20,
        width: Dimensions.get('window').width - 30,
        backgroundColor: '#FF8400',
        padding: 10,
        borderRadius: 15,
        flexDirection: 'column',
        alignItems: 'center'
    },
    createButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    mediaButton: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 10,
    },
    mediaButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FF8400',
        marginRight: 10,
    },
    charCount: {
        marginLeft: 10,
    },
    charCountRed: {
        color: 'red',
    },
    charCountYellow: {
        color: '#FFD700',
    },
    input: {
        backgroundColor: 'white',
        marginBottom:25,
        borderColor: '#FF8400',
        borderWidth: 1,
        borderRadius: 20,
        paddingHorizontal: 10,
        width: Dimensions.get('window').width - 30,
        justifyContent: 'center'
    },
    label: {
        alignSelf: 'flex-start',
        marginLeft: 5,
        marginBottom: 15,
        color: 'black',
        fontWeight: 'bold',
        fontSize:17
    },
    textInputContainer: {
        alignSelf: 'stretch',
        marginTop: 20,
    },
    textInput: {
        color: '#FF8400',
        width: '100%',
        paddingHorizontal: 10,
        height: 55,
    },
    background: {
        flex: 1,
    },
    indicator:{
        flex:1,
        justifyContent:'center',
        alignItems:'center',
    },
    scrollContainer: {
        flexGrow: 1,
        justifyContent: 'center',
    },
    header:{
        flexDirection:'row',
        alignItems:'center',
    },
    contentContainer: {
        padding: 20,
    },

    iconBackground: {
        width: 40,
        height: 40,
        borderRadius: 30,
        backgroundColor: '#FF8400',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    profileContainer: {
        alignItems: 'center', // Center the profile picture container within the parent
        justifyContent: 'center',
        marginBottom: 20,
    },
    profilePictureWrapper: {
        position: 'relative', // To allow absolute positioning of the edit button
        width: 200, // Ensure this matches the profile picture's dimensions
        height: 200,
        alignItems: 'center',
        justifyContent: 'center',
    },
    profilePicture: {
        width: 200,
        height: 200,
        borderRadius: 100, // Make the picture round
    },
    editButton: {
        position: 'absolute',
        bottom: 10,
        right: 10,
        backgroundColor: '#000',
        borderRadius: 20,
        padding: 8,
    },
    username: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        textAlign: 'center',
    },
    bio: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 20,
    },
    joinDate: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginBottom: 20,
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        marginBottom: 20,
        width:'100%'
    },
    statItem: {
        alignItems: 'center',
    },
    statNumber: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    statLabel: {
        fontSize: 14,
        color: '#666',
    },
    divider: {
        height: 40,
        width: 1,
        backgroundColor: '#ccc',
    },
    buttonsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 20,
    },
    friendButtons: {
        flexDirection: 'row',
    },
    outlinedButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderWidth: 1,
        borderRadius: 20,
        marginHorizontal: 5,
    },
    buttonText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    buttonIcon: {
        marginRight: 10,
    },
    mediaContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'center',
    },
    mediaImage: {
        width: 100,
        height: 100,
        margin: 5,
        borderRadius: 5,
    },
    loadMoreButton: {
        marginTop: 10,
        paddingVertical: 10,
        paddingHorizontal: 20,
        backgroundColor: '#FF8400',
        borderRadius: 5,
    },
    loadMoreText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: 'white',
    },
    backButton: {
        position: 'absolute',
        top: 20,
        left: 20,
    },
    modalBackground: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
    },
    modalContainer: {
        width: modalSize,
        height: modalSize,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: modalSize / 2,
        overflow: 'hidden',
    },
    modalImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
        borderRadius: modalSize / 2,
    },
    title: { fontSize: 27, fontWeight: '800', color: 'white' },
    editModalContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#f5f5f5',
        padding: 20,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        shadowColor: '#000',
        shadowOffset: { width: 5, height: 5 },
        shadowOpacity: 1,
        shadowRadius: 4,
        elevation: 10,
    },
    modalOption: {
        paddingVertical: 15,
    },
    modalOptionText: {
        fontSize: 18,
        color: '#FF8400',
        textAlign: 'center',
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    uploadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    uploadingText: {
        marginTop: 10,
        fontSize: 18,
        color: '#FFF',
    },
});

export default EditProfile;
