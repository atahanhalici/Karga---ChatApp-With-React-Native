import React, { Component } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, SafeAreaView } from 'react-native';
import Message from '../../Components/Rooms/Message';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { TouchableOpacity } from 'react-native-gesture-handler';
import auth from '@react-native-firebase/auth';
import firebase from '@react-native-firebase/app';



class Chat extends Component {
    constructor(props) {
        super(props);
        this.state = {
            messages: [],
            text: '',
            connectedUserCount: 0,
            otherUserInChat:false,
            otherUserInWrite:false,
            otherUserLastOnline:null,
            otherUserIsOnline:false,
            showTooltip: false,
            userName:""
        };
        this.typingTimeout = null;
    }
    updateTypingStatus = async (conversationId, status) => {
        const userId = firebase.auth().currentUser.uid;
        const conversationRef = firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/').ref(`/conversations/${conversationId}/userStatus/${userId}`);
        
        await conversationRef.update({ write: status });
    }

    handleTextInputChange = (text) => {
        const { conversationId } = this.props.route.params;
        this.setState({ text });
    
        if (conversationId) {
            clearTimeout(this.typingTimeout);
            this.updateTypingStatus(conversationId, true);
            this.typingTimeout = setTimeout(() => {
                this.updateTypingStatus(conversationId, false);
            }, 2000); // Set typing status to false after 2 seconds of inactivity
        }
    }

    handleTextInputEndEditing = () => {
        const { conversationId } = this.props.route.params;
        if (conversationId) {
            clearTimeout(this.typingTimeout);
            this.updateTypingStatus(conversationId, false);
        }
    }
    
    showTooltip = () => {
        this.setState({ showTooltip: true });
        setTimeout(() => {
            this.setState({ showTooltip: false });
        }, 1000); // Tooltip will stay visible for 2 seconds
    }
    // Kullanıcı bağlantı durumu düşürme işlevi
 decreaseConnectedUserCount = (roomId) => {

    // Firebase referansı oluşturun
    const roomRef = firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/').ref(`rooms/${roomId}`);

    // Kullanıcı bağlantısı kesildiğinde bu işlemi yap
    roomRef.onDisconnect().update({
        connectedUserCount: firebase.database.ServerValue.increment(-1)
    });
};

decreaseConversationUserStatus = (conversationId) => {
    const userId = firebase.auth().currentUser.uid;
    const conversationRef = firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/').ref(`/conversations/${conversationId}/userStatus/${userId}`);
    
    conversationRef.onDisconnect().update({
        inChat: false,
        lastLeft: firebase.database.ServerValue.TIMESTAMP
    });
};

cancelDisconnect = (roomId) => {
    const roomRef = firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/').ref(`rooms/${roomId}`);
        
            roomRef.onDisconnect().cancel(); // Firebase'de onDisconnect'i iptal et
        
    };

    cancelDisconnectConversation = (conversationId) => {
        const userId = firebase.auth().currentUser.uid;
        const conversationRef = firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/').ref(`/conversations/${conversationId}/userStatus/${userId}`);
            
                conversationRef.onDisconnect().cancel(); // Firebase'de onDisconnect'i iptal et
            
        };

        renderItem = ({ item, index }) => {
            const { roomId, conversationId,name } = this.props.route.params;
            const isConversation = Boolean(conversationId);
        
            if (conversationId) {
                return <Message item={item} index={index} otherUser={name}   isConversation={isConversation}></Message>;
            } else if (roomId) {
                return <Message item={item} index={index}></Message>;
            }
        };
        
        getStatusText = () => {
            const { otherUserInWrite, otherUserInChat, otherUserIsOnline, otherUserLastOnline } = this.state;
            
            if (otherUserInWrite) {
                return "Typing";
            } else if (otherUserInChat) {
                return "In Conversation";
            } else if (otherUserIsOnline) {
                return "Online";
            } else {
                return `Last Online: ${this.formatLastOnlineTime(otherUserLastOnline)}`;
            }
        }
        
        formatLastOnlineTime = (timestamp) => {
            const now = new Date();
            const lastOnline = new Date(timestamp);
            const diffInSeconds = Math.floor((now - lastOnline) / 1000);
        
            if (diffInSeconds < 60) {
                return "just now";
            } else if (diffInSeconds < 3600) { // less than an hour
                const minutes = Math.floor(diffInSeconds / 60);
                return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
            } else if (diffInSeconds < 86400) { // less than a day
                const hours = Math.floor(diffInSeconds / 3600);
                return `${hours} hour${hours > 1 ? 's' : ''} ago`;
            } else if (diffInSeconds < 604800) { // less than a week
                const days = Math.floor(diffInSeconds / 86400);
                return `${days} day${days > 1 ? 's' : ''} ago`;
            } else if (diffInSeconds < 2592000) { // less than a month
                const weeks = Math.floor(diffInSeconds / 604800);
                return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
            } else if (diffInSeconds < 31536000) { // less than a year
                const months = Math.floor(diffInSeconds / 2592000);
                return `${months} month${months > 1 ? 's' : ''} ago`;
            } else {
                const years = Math.floor(diffInSeconds / 31536000);
                return `${years} year${years > 1 ? 's' : ''} ago`;
            }
        }
        
        updateHeader = () => {
            const { conversationId, name } = this.props.route.params;
            this.props.navigation.setOptions({
                headerTitle: () => (
                    <View>
                        <Text style={style.headerTitle}>{name}</Text>
                        {conversationId && <Text style={style.headerSubtitle}>{this.getStatusText()}</Text>}
                    </View>
                ),
            });
        }
        
        componentDidUpdate(prevProps, prevState) {
            if (
                prevState.otherUserInWrite !== this.state.otherUserInWrite ||
                prevState.otherUserInChat !== this.state.otherUserInChat ||
                prevState.otherUserIsOnline !== this.state.otherUserIsOnline ||
                prevState.otherUserLastOnline !== this.state.otherUserLastOnline
            ) {
                this.updateHeader();
            }
        }
        
        componentDidMount() {
            const { roomId, conversationId, name } = this.props.route.params;
            this.updateHeader();
        
            if (roomId) {
                this.joinRoom(roomId);
                firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/')
                    .ref(`messages/${roomId}`)
                    .orderByChild('timestamp')
                    .on('value', snapshot => {
                        var messages = [];
                        snapshot.forEach((item) => {
                            messages.push({
                                roomId: item.val().roomId,
                                text: item.val().text,
                                userName: item.val().userName,
                                userId: item.val().userId,
                                timestamp: item.val().timestamp,
                                id: item.key,
                            });
                        });
                        messages.sort((a, b) => b.timestamp - a.timestamp);
                        this.setState({ messages });
                    });
        
                firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/')
                    .ref(`rooms/${roomId}/connectedUserCount`)
                    .on('value', snapshot => {
                        this.setState({ connectedUserCount: snapshot.val() || 0 });
                    });
        
                this.decreaseConnectedUserCount(roomId);
            } else if (conversationId) {
                this.otherUserListen(conversationId);
                this.fetchConversationMessages(conversationId);
                this.handleJoinChat(conversationId);
                this.decreaseConversationUserStatus(conversationId);
                this.markMessagesAsRead(conversationId);
            }
        }

    markMessagesAsRead = (conversationId) => {
        const userId = firebase.auth().currentUser.uid;
        const messagesRef = firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/').ref(`conversations/${conversationId}/messages`);
    
        messagesRef.once('value', snapshot => {
            snapshot.forEach((childSnapshot) => {
                if (childSnapshot.val().userId !== userId && !childSnapshot.val().read) {
                    childSnapshot.ref.update({ read: true });
                }
            });
        });
    };
     handleLeaveChat = async (conversationId) => {
        const userId = firebase.auth().currentUser.uid;
        const conversationRef = firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/').ref(`/conversations/${conversationId}/userStatus/${userId}`);
        
        await conversationRef.update({
            inChat: false,
            lastLeft: firebase.database.ServerValue.TIMESTAMP
        });
        
        console.log(`User ${userId} left conversation ${conversationId}`);
    };
    componentWillUnmount() {
        const { roomId , conversationId} = this.props.route.params;
        clearInterval(this.statusInterval);
        if (roomId) {
            this.cancelDisconnect(roomId);
            this.leaveRoom(roomId);

        }else{
            this.cancelDisconnectConversation(conversationId);
this.handleLeaveChat(conversationId);
        }
    }

    joinRoom = async (roomId) => {
        const roomRef = firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/').ref(`rooms/${roomId}/connectedUserCount`);
        await roomRef.transaction(count => {
            return (count || 0) + 1;
        });
    };
     handleJoinChat = async (conversationId) => {
        const userId = firebase.auth().currentUser.uid;
        const conversationRef = firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/').ref(`/conversations/${conversationId}/userStatus/${userId}`);
        
        await conversationRef.update({
            inChat: true,
            lastLeft: null
        });
        
        console.log(`User ${userId} joined conversation ${conversationId}`);
    };
    leaveRoom = async (roomId) => {
        const roomRef = firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/').ref(`rooms/${roomId}/connectedUserCount`);
        await roomRef.transaction(count => {
            return (count || 0) - 1;
        });
    };

    fetchConversationMessages = (conversationId) => {
        firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/')
            .ref(`conversations/${conversationId}/messages`)
            .orderByChild('timestamp') // timestamp alanına göre sıralama
            .on('value', snapshot => {
                var messages = [];
                snapshot.forEach((item) => {
                    messages.push({
                        conversationId: item.val().conversationId,
                        text: item.val().text,
                        userName: item.val().userName,
                        userId: item.val().userId,
                        timestamp: item.val().timestamp, // Zaman damgasını dahil et
                        id: item.key,
                        read:item.val().read,
                        messageType:item.val().messageType
                    });
                });
                // Tarihe göre sıralama
                messages.sort((a, b) => b.timestamp - a.timestamp);
                
                this.setState({ messages });
            });
    };

     otherUserListen = async (conversationId) => {
        const userId = auth().currentUser.uid;
        const db = firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/');
    
        // Get other user ID
        const snapshot = await db.ref(`conversations/${conversationId}/members`).once('value');
        let otherUser = null;
        snapshot.forEach(childSnapshot => {
            const userIds = childSnapshot.val();
            if (userIds !== userId) {
                otherUser = userIds;
            }
        });
    
        if (!otherUser) {
            console.error('Other user not found');
            return;
        }
    
        // Get other user data
        const otherUserRef =  db.ref(`users/${otherUser}`);
        otherUserRef.on('value', snapshot => {
            const userStatus = snapshot.val();
            this.setState({userName:userStatus.userName, otherUserIsOnline:userStatus.online, otherUserLastOnline:userStatus.lastOnlineTime})
            console.log("bişeler olsu");
        });
      

        

        
        // Listen to other user's status in the conversation
        const userStatusRef = db.ref(`/conversations/${conversationId}/userStatus/${otherUser}`);
        userStatusRef.on('value', snapshot => {
            const userStatus = snapshot.val();
            this.setState({ otherUserInChat: userStatus?.inChat || false, otherUserInWrite: userStatus?.write || false});
            console.log(`Other user's chat status: ${this.state.otherUserInChat}`);
        });
    };
    handleSend = async (messageType = "text") => {
        const { text } = this.state;
        const { roomId, conversationId,name } = this.props.route.params;
    
        const user = auth().currentUser;
        const userId = user.uid;
        const userName = user.displayName;
        const timestamp = firebase.database.ServerValue.TIMESTAMP;
    
        let newReference;
        let token;
        let read = false;
    
        if (roomId) {
            newReference = firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/').ref(`messages/${roomId}`).push();
        } else if (conversationId) {
            newReference = firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/').ref(`conversations/${conversationId}/messages`).push();
            try {
                const snapshot = await firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/').ref(`conversations/${conversationId}/members`).once('value');
                let otherUser = null;
                snapshot.forEach(childSnapshot => {
                    const userIds = childSnapshot.val();
                    if (userIds !== userId) {
                        otherUser = userIds;
                    }
                });
    
                if (otherUser) {
                    const otherUserSnapshot = await firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/').ref(`users/${otherUser}`).once('value');
                    const otherUserData = otherUserSnapshot.val();
                    if (otherUserData && otherUserData.fcmToken) {
                        token = otherUserData.fcmToken;
    
                        const userStatusSnapshot = await firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/').ref(`/conversations/${conversationId}/userStatus/${otherUser}`).once('value');
                        const userStatus = userStatusSnapshot.val();
    
                        const otherUserLastLeftSnapshot = await firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/').ref(`/conversations/${conversationId}/userStatus/${otherUser}/lastLeft`).once('value');
                        const otherUserLastLeft = otherUserLastLeftSnapshot.val();
    
                        if (userStatus && userStatus.inChat) {
                            read = true;
                            token = null; // If the user is in the chat, do not send a notification
                        } else if (timestamp <= otherUserLastLeft) {
                            read = true;
                        } else if (messageType === "vibration" && !userStatus.inChat) {
                           // alert(`${name} şu anda bu sohbette aktif değil`);
                            return;
                        }
                    } else {
                        throw new Error('FCM token not found for the other user');
                    }
                } else {
                    throw new Error('Other user not found in the conversation');
                }
            } catch (error) {
                console.error('Error:', error);
            }
        }
    
        let messageData = {
            text: messageType === "vibration" ? "" : text,
            userId: userId,
            userName: userName,
            timestamp: timestamp,
            messageType: messageType,
        };
    
        if (conversationId) {
            messageData.read = read; // Sadece conversation için read ekle
        }
    
        newReference.set(messageData).then(() => {
            const newReferencess = firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/').ref(`conversations/${conversationId}/`).update({lastMessageTime:timestamp});
            if (token && messageType !== "vibration") {
                fetch('http://192.168.0.23:3000/send-notification', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        token: token,
                        title: `${userName}`,
                        body: text
                    })
                }).then(response => response.json())
                    .then(data => {
                        console.log('Notification sent:', data);
                    }).catch(error => {
                        console.error('Error sending notification:', error);
                    });
            }
            this.setState({ text: '' });
        }).catch((error) => {
            alert("Error! Failed to send message");
            console.error("Error sending message:", error);
        });
    };
    
    
    render() {
        const { text, messages, connectedUserCount, otherUserInChat, showTooltip } = this.state;
        const { roomId, conversationId } = this.props.route.params;
        const isConversation = Boolean(conversationId);
        return (
            <SafeAreaView style={{ flex: 1 }}>
                {roomId && (
                    <View style={{ padding: 10, backgroundColor: '#ddd', alignItems: 'center', justifyContent: 'center' }}>
                        <Text>Connected Users: {connectedUserCount}</Text>
                    </View>
                )}
                <FlatList
                    inverted
                    ref={(ref) => this.flatListRef = ref}
                    data={messages}
                    style={style.flatlist}
                    renderItem={this.renderItem}
                    keyExtractor={(item) => item.id}
                />
                <View style={style.inputArea}>
                    <View style={{ alignItems: 'center', flexDirection: 'row' }}>
                        <TextInput value={text} style={style.input} placeholder='Write message..'  onChangeText={this.handleTextInputChange}
                            onEndEditing={this.handleTextInputEndEditing}></TextInput>
                        <TouchableOpacity onPress={this.handleSend}>
                            <Icon name={"paper-plane"} size={25} color='#FF8400'></Icon>
                        </TouchableOpacity>
                        {conversationId && (
                            <View style={{ position: 'relative' }}>
                                <TouchableOpacity onPress={() => this.handleSend("vibration")} onPressIn={this.showTooltip}>
                                    <Icon name="wave-square" size={24} color={otherUserInChat ? "#FF8400" : "gray"} style={{ padding: 10 }} />
                                </TouchableOpacity>
                                {showTooltip && !otherUserInChat && (
                                    <View style={style.tooltip}>
                                        <Text style={style.tooltipText}>{this.state.userName} şu anda sohbette değil</Text>
                                    </View>
                                )}
                            </View>
                        )}
                    </View>
                </View>
            </SafeAreaView>
        );
    }
}

const style = StyleSheet.create({
    flatlist: {
        flex: 1
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#000',
    },
    headerSubtitle: {
        fontSize: 12,
        color: '#666',
    },
    inputArea: {
        padding: 10,
        borderTopColor: '#dedede',
        borderTopWidth: 1
    },
    input: {
        backgroundColor: '#dedede',
        borderRadius: 15,
        paddingLeft: 20,
        flex: 1,
        height: 50,
        marginRight: 20
    },
    send: {
        backgroundColor: '#FF8400',
        paddingHorizontal: 10,
        paddingVertical: 15,
        borderRadius: 8,
    },
    tooltip: {
        position: 'absolute',
        bottom: 40,
        right: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.6)', // Lighter background color
        padding: 10, // Increased padding
        borderRadius: 5,
        width: 200, // Increased width
        justifyContent: 'center', // Center the text horizontally
        alignItems: 'center', // Center the text horizontally
    },
    tooltipText: {
        color: '#000',
        fontSize: 12,
    },
});

export default Chat;