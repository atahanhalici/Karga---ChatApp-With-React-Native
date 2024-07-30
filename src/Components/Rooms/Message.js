import React, { useState, useEffect } from "react";
import { TouchableOpacity, Text, StyleSheet, Dimensions, View, Vibration, Image, Modal } from "react-native";
import Icon from 'react-native-vector-icons/FontAwesome5';
import auth from '@react-native-firebase/auth';

const Message = ({ item, index, otherUser, isConversation, read, isGroup, openModall }) => {
    const user = auth().currentUser;
    const userId = user.uid;
    const [lastVibrated, setLastVibrated] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);

    const handleImagePress = () => {
        setModalVisible(true);
    };

    const closeModal = () => {
        setModalVisible(false);
    };

    // Determine the message text based on type and user ID
    let messageText = item.text;
    if (item.messageType === "vibration") {
        if (isConversation) {
            if (item.userId !== userId) {
                messageText = `${item.userName} sizi titretti`;
                const messageDate = new Date(item.timestamp);
                const now = Date.now();
                const timeSinceMessage = now - messageDate;

                // Check if the message is within the last 2 seconds and hasn't been vibrated for yet
                if (timeSinceMessage < 2000 && (!lastVibrated || messageDate > lastVibrated)) {
                    Vibration.vibrate(1000);
                    setLastVibrated(messageDate); // Update the last vibrated message timestamp
                }
            } else {
                messageText = `${otherUser} kullanıcısını titrettiniz`;
            }
        } else if (isGroup) {
            const isCurrentUserInSelectedUsers = item.selectedUsers.some(user => user.userId === userId);

            if (isCurrentUserInSelectedUsers) {
                if (item.selectedUsers.length === 1) {
                    messageText = `${item.userName} sizi titretti`;
                } else if (item.selectedUsers.length === 2) {
                    const otherUserName = item.selectedUsers.find(user => user.userId !== userId).userName;
                    messageText = `${item.userName}, sizi ve ${otherUserName} adlı kullanıcıyı titretti`;
                } else {
                    messageText = `${item.userName} ve diğer kullanıcıları titretti`;
                }

                const messageDate = new Date(item.timestamp);
                const now = Date.now();
                const timeSinceMessage = now - messageDate;

                // Check if the message is within the last 2 seconds and hasn't been vibrated for yet
                if (timeSinceMessage < 2000 && (!lastVibrated || messageDate > lastVibrated)) {
                    Vibration.vibrate(1000);
                    setLastVibrated(messageDate); // Update the last vibrated message timestamp
                }
            } else {
                if (item.selectedUsers.length < 2) {
                    const selectedUserNames = item.selectedUsers.map(user => user.userName).join(", ");
                    messageText = `${item.userName}, ${selectedUserNames} kullanıcısını titretti`;
                } else {
                    messageText = `${item.userName}, birden fazla kişiyi titretti`;
                }
            }
        }
    }
    const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    };
    return (
        <View style={(userId !== item.userId) ? style.other : style.me}>
            <View style={[style.bubble, {
                borderTopRightRadius: (userId === item.userId) ? 0 : 15,
                borderTopLeftRadius: (userId === item.userId) ? 15 : 0,
                backgroundColor: (userId === item.userId) ? '#FF8400' : '#ddd'
            }]}>
                {item.messageType === "image" ? (
                    <TouchableOpacity onPress={handleImagePress} onLongPress={() => {
                        if (item.userId === userId && isGroup) {
                            openModall(item.id);
                        }
                    }}>
                        <Image
                            source={{ uri: item.text }}
                            style={{ width: 200, height: 200, marginBottom: 10 }} // Adjust width and height as needed
                        />
                    </TouchableOpacity>
                ) : (
                    <Text style={{ color: (userId === item.userId) ? 'white' : '#575757', fontSize: 15, marginBottom: 8 }}>
                        {messageText}
                    </Text>
                )}

                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: userId === item.userId ? 'white' : '#575757', textAlign: userId === item.userId ? 'right' : 'left', fontSize: 11 }}>
                        {item.userName}
                    </Text>
                    <View style={{flex:1}}></View>
                    <Text style={{ color: userId === item.userId ? 'white' : '#575757', textAlign: userId === item.userId ? 'right' : 'left', fontSize: 11, paddingLeft:10 }}>
                        {formatTime(item.timestamp)}
                    </Text>

                    {(isConversation || isGroup) && userId === item.userId && (
                        <Icon
                            name={'check'}
                            size={11}
                            style={{ color: read ? '#0f73ae' : 'black', marginLeft: 10 }}
                        />
                    )}
                </View>

                <Modal visible={modalVisible} transparent={true} onRequestClose={closeModal}>
                    <View style={style.modalBackground}>
                        <TouchableOpacity style={style.modalContainer} onPress={closeModal}>
                            <Image
                                source={{ uri: item.text }}
                                style={style.fullscreenImage}
                                resizeMode="contain"
                            />
                        </TouchableOpacity>
                    </View>
                </Modal>
            </View>
        </View>
    );
}
const style = StyleSheet.create({
    other: {
        flexDirection: 'row',
        flex: 1,
        justifyContent: 'flex-start'
    },
    me: {
        flexDirection: 'row',
        flex: 1,
        justifyContent: 'flex-end'
    },
    bubble: {
        padding: 10,
        backgroundColor: '#ddd',
        maxWidth: Dimensions.get('window').width * 0.7,
        marginBottom: 10,
        borderRadius: 15,
        margin: 10
    },
    modalBackground: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullscreenImage: {
        width: '80%',
        height: 'auto',
        aspectRatio: 1, // Ensures the aspect ratio is maintained
    },
});

export default Message;
