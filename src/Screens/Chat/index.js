import React, { Component } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, SafeAreaView,Modal, TouchableOpacity,TouchableWithoutFeedback,SectionList} from 'react-native';
import CheckBox from '@react-native-community/checkbox';
import Message from '../../Components/Rooms/Message';
import Icon from 'react-native-vector-icons/FontAwesome5';
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
            userName:"",
            members: {},
            allMembers:[],
            friends: [],
            showModal: false,
            showModall: false,
            selectedFriends: [], 
            activeUsers:[],
            sections:[],
            selectAll: false,
        };
        this.typingTimeout = null;
    }
    updateTypingStatus = async (id, status, isGroup = false) => {
        const userId = firebase.auth().currentUser.uid;
    
        const path = isGroup 
            ? `/groups/${id}/userStatus/${userId}` 
            : `/conversations/${id}/userStatus/${userId}`;
    
        const ref = firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/').ref(path);
    
        await ref.update({ write: status });
    }
    
    handleTextInputChange = (text) => {
        const { conversationId, groupId } = this.props.route.params;
        this.setState({ text });
    
        if (conversationId || groupId) {
            clearTimeout(this.typingTimeout);
            const id = conversationId || groupId;
            const isGroup = !!groupId;
    
            this.updateTypingStatus(id, true, isGroup);
            this.typingTimeout = setTimeout(() => {
                this.updateTypingStatus(id, false, isGroup);
            }, 2000); // Set typing status to false after 2 seconds of inactivity
        }
    }
    
    handleTextInputEndEditing = () => {
        const { conversationId, groupId } = this.props.route.params;
        if (conversationId || groupId) {
            clearTimeout(this.typingTimeout);
            const id = conversationId || groupId;
            const isGroup = !!groupId;
    
            this.updateTypingStatus(id, false, isGroup);
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

decreaseGroupUserStatus = (groupId) => {
    const userId = firebase.auth().currentUser.uid;
    const groupRef = firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/').ref(`/groups/${groupId}/userStatus/${userId}`);
    
    groupRef.onDisconnect().update({
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

        cancelDisconnectGroup = (groupId) => {
            const userId = firebase.auth().currentUser.uid;
            const conversationRef = firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/').ref(`/groups/${groupId}/userStatus/${userId}`);
                
                    conversationRef.onDisconnect().cancel(); // Firebase'de onDisconnect'i iptal et
                
            };

        renderItem = ({ item, index }) => {
            const { roomId, conversationId,name, groupId} = this.props.route.params;
            const isConversation = Boolean(conversationId);
            const isGroup = Boolean(groupId);
            const userId = firebase.auth().currentUser.uid;
            if (conversationId) {
                return <Message item={item} index={index} otherUser={name}   isConversation={isConversation} read={item.read}></Message>;
            } else if (roomId) {
                return <Message item={item} index={index}></Message>;
            }
            else if(groupId){
                return <TouchableOpacity onLongPress={() => {
                    if (item.userId === userId) {
                        console.log("sa");
                        this.openModall(item.id);
                    }
                }}><Message item={item} index={index} isGroup={isGroup} read={this.state.allMembers.every(member => item.read.includes(member))}/></TouchableOpacity>;
            }
        };
        
        getStatusText = () => {
            const { otherUserInWrite, otherUserInChat, otherUserIsOnline, otherUserLastOnline, members } = this.state;
            const { conversationId, groupId } = this.props.route.params;
    
            if (conversationId) {
                if (otherUserInWrite) {
                    return "Typing";
                } else if (otherUserInChat) {
                    return "In Conversation";
                } else if (otherUserIsOnline) {
                    return "Online";
                } else {
                    return `Last Online: ${this.formatLastOnlineTime(otherUserLastOnline)}`;
                }
            } else if (groupId) {
                const writingMembers = Object.values(members).filter(member => member.write);
                const chattingMembers = Object.values(members).filter(member => member.inChat);
                const onlineMembers = Object.values(members).filter(member => member.online);
    
                if (writingMembers.length > 0) {
                    if (writingMembers.length === 1) {
                        return `${writingMembers[0].userName} is typing`;
                    } else {
                        return "Multiple users are typing";
                    }
                } else if (chattingMembers.length > 0) {
                    if (chattingMembers.length === 1) {
                        return `${chattingMembers[0].userName} is in conversation`;
                    } else {
                        return "Multiple users are in conversation";
                    }
                } else if (onlineMembers.length > 0) {
                    if (onlineMembers.length === 1) {
                        return `${onlineMembers[0].userName} is online`;
                    } else {
                        return `${onlineMembers.length} users online`;
                    }
                  
                } else {
                    return "No members online";
                }
            }
            return "";
        };
    
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
            const { conversationId, name, groupId } = this.props.route.params;
            this.props.navigation.setOptions({
                headerTitle: () => (
                    <View>
                        <Text style={style.headerTitle}>{name}</Text>
                        {(conversationId || groupId) && (
                            <Text style={style.headerSubtitle}>{this.getStatusText()}</Text>
                        )}
                    </View>
                ),
            });
        };
    
        componentDidUpdate(prevProps, prevState) {
            if (
                prevState.otherUserInWrite !== this.state.otherUserInWrite ||
                prevState.otherUserInChat !== this.state.otherUserInChat ||
                prevState.otherUserLastOnline !== this.state.otherUserLastOnline ||
                prevState.otherUserIsOnline !== this.state.otherUserIsOnline ||
                prevState.members !== this.state.members
            ) {
                this.updateHeader();
            }
        }
    
        componentDidMount() {
            const { roomId, conversationId, groupId } = this.props.route.params;
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
            }else if (groupId){
             
                this.activeUsersListen(groupId);
                this.groupListen(groupId)
                this.getAllMembers(groupId);
                this.fetchGroupMessages(groupId);
                this.handleJoinGroup(groupId);
                this.decreaseGroupUserStatus(groupId);
                this.markMessagesAsReadGroup(groupId);
            }
        }


    getAllMembers =async (groupId)=>{
        const membersRef = firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/').ref(`groups/${groupId}/members`);

        // `members` düğümünü dinleyin
        const onValueChange = membersRef.on('value', snapshot => {
          const data = snapshot.val();
          this.setState({allMembers:data})
        });
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


     markMessagesAsReadGroup = (groupId) => {
        const userId = firebase.auth().currentUser.uid;
        const messagesRef = firebase
            .app()
            .database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/')
            .ref(`groups/${groupId}/messages`);
    
        messagesRef.once('value', snapshot => {
            snapshot.forEach((childSnapshot) => {
                const message = childSnapshot.val();
                if (message.userId !== userId && (!message.read || !Array.isArray(message.read) || !message.read.includes(userId))) {
                    const readArray = Array.isArray(message.read) ? message.read : [];
                    readArray.push(userId);
                    childSnapshot.ref.update({ read: readArray });
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
        

    };

    handleLeaveGroup = async (groupId) => {
        const userId = firebase.auth().currentUser.uid;
        const groupRef = firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/').ref(`/groups/${groupId}/userStatus/${userId}`);
        
        await groupRef.update({
            inChat: false,
            lastLeft: firebase.database.ServerValue.TIMESTAMP
        });
        

    };
    componentWillUnmount() {
        const { roomId , conversationId,groupId} = this.props.route.params;
        clearInterval(this.statusInterval);
        if (roomId) {
            this.cancelDisconnect(roomId);
            this.leaveRoom(roomId);

        }else if(conversationId){
            this.cancelDisconnectConversation(conversationId);
this.handleLeaveChat(conversationId);
        }else if(groupId){
            this.cancelDisconnectGroup(groupId);
            this.handleLeaveGroup(groupId);
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
        

    };

    handleJoinGroup = async (groupId) => {
        const userId = firebase.auth().currentUser.uid;
        const groupRef = firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/').ref(`/groups/${groupId}/userStatus/${userId}`);
        
        await groupRef.update({
            inChat: true,
            lastLeft: null
        });
        

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


    fetchGroupMessages = (groupId) => {
        firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/')
            .ref(`groups/${groupId}/messages`)
            .orderByChild('timestamp') // timestamp alanına göre sıralama
            .on('value', snapshot => {
                var messages = [];
                snapshot.forEach((item) => {
                    messages.push({
                        groupId: item.val().groupId,
                        text: item.val().text,
                        userName: item.val().userName,
                        userId: item.val().userId,
                        timestamp: item.val().timestamp, // Zaman damgasını dahil et
                        id: item.key,
                        read: item.val().read,
                        messageType: item.val().messageType,
                        selectedUsers:item.val().selectedUsers
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
          
        });
      

        

        
        // Listen to other user's status in the conversation
        const userStatusRef = db.ref(`/conversations/${conversationId}/userStatus/${otherUser}`);
        userStatusRef.on('value', snapshot => {
            const userStatus = snapshot.val();
            this.setState({ otherUserInChat: userStatus?.inChat || false, otherUserInWrite: userStatus?.write || false});
         
        });
    };

    groupListen = async (groupId) => {
        try {
            const userId = auth().currentUser.uid;
            const db = firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/');
            
            // Get all group member IDs
            const snapshot = await db.ref(`groups/${groupId}/members`).once('value');
            const members = [];
            snapshot.forEach(childSnapshot => {
                const memberId = childSnapshot.val();
                if (memberId !== userId) {
                    members.push(memberId);
                }
            });
            
            if (members.length === 0) {
                console.error('No other members found');
                return;
            }
    
            // Listen to each member's status
            members.forEach(memberId => {
                // Get member data
                const memberRef = db.ref(`users/${memberId}`);
                memberRef.on('value', snapshot => {
                    const userStatus = snapshot.val();
                    this.setState(prevState => ({
                        members: {
                            ...prevState.members,
                            [memberId]: {
                                ...prevState.members[memberId],
                                userName: userStatus?.userName,
                                online: userStatus?.online,
                                lastOnlineTime: userStatus?.lastOnlineTime
                            }
                        }
                    }), this.updateHeader); // Ensure updateHeader is called after state update
                });
    
                // Listen to member's status in the conversation
                const userStatusRef = db.ref(`/groups/${groupId}/userStatus/${memberId}`);
                userStatusRef.on('value', snapshot => {
                    const userStatus = snapshot.val();
                    this.setState(prevState => ({
                        members: {
                            ...prevState.members,
                            [memberId]: {
                                ...prevState.members[memberId],
                                inChat: userStatus?.inChat || false,
                                write: userStatus?.write || false,
                            }
                        }
                    }), this.updateHeader); // Ensure updateHeader is called after state update
                });
            });
        } catch (error) {
            console.error('Error fetching group members or updating statuses:', error);
        }
    };
    
    
    handleSend = async (messageType = "text") => {
        const { text,selectedFriends } = this.state;
        const { roomId, conversationId, groupId, name } = this.props.route.params;
    
        const user = auth().currentUser;
        const userId = user.uid;
        const userName = user.displayName;
        const timestamp = firebase.database.ServerValue.TIMESTAMP;
        let selectedUsers = [];
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
        } else if (groupId) {
            newReference = firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/').ref(`groups/${groupId}/messages`).push();
            read = [];
    
            try {
                const groupSnapshot = await firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/').ref(`groups/${groupId}/members`).once('value');
                let tokens = [];



                const membersPromises = [];
                groupSnapshot.forEach(childSnapshot => {
                    const memberId = childSnapshot.val();
                    membersPromises.push(
                        firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/').ref(`groups/${groupId}/userStatus/${memberId}`).once('value')
                            .then(memberStatusSnapshot => {
                                const memberStatus = memberStatusSnapshot.val();
                                if (memberStatus && memberStatus.inChat) {
                                    read.push(memberId);
                                } else {
                                    return firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/').ref(`users/${memberId}`).once('value')
                                        .then(memberSnapshot => {
                                            const memberData = memberSnapshot.val();
                                            if (memberData && memberData.fcmToken) {
                                                tokens.push(memberData.fcmToken);
                                            }
                                        });
                                }
                            })
                    );
                });



                if(messageType==="vibration"){
                    for (const friendId of selectedFriends) {
                        const friendSnapshot = await firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/').ref(`users/${friendId}`).once('value');
                        const friendData = friendSnapshot.val();
                        if (friendData) {
                            selectedUsers.push({ userId: friendId, userName: friendData.userName });
                        }
                    }
                }
    
                await Promise.all(membersPromises);
    if(messageType!=="vibration"){
        tokens.forEach(token => {
            if (messageType !== "vibration") {
                fetch('http://192.168.0.23:3000/send-notification', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        token: token,
                        title: `${name}`,
                        body: `${userName}: ${text}`
                    })
                }).then(response => response.json())
                    .then(data => {
                    }).catch(error => {
                    });
            }
        });
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
            messageData.read = read;
        } else if (groupId) {
            messageData.read = read;
            if(messageType=="vibration"){
                messageData.selectedUsers=selectedUsers
            }
        }
    
        newReference.set(messageData).then(() => {
            if (conversationId) {
                firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/').ref(`conversations/${conversationId}/`).update({ lastMessageTime: timestamp });
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

                        }).catch(error => {
                       
                        });
                }
            } else if (groupId) {
                firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/').ref(`groups/${groupId}/`).update({ lastMessageTime: timestamp });
            }
            this.setState({ text: '' });
        }).catch((error) => {
            alert("Error! Failed to send message");
            console.error("Error sending message:", error);
        });
    };

    activeUsersListen = (groupId) => {
        try {
            const userId = auth().currentUser.uid;
            const db = firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/');
            
            // Get all group member IDs
            const groupMembersRef = db.ref(`groups/${groupId}/members`);
            groupMembersRef.on('value', async (snapshot) => {
                const members = [];
                snapshot.forEach(childSnapshot => {
                    const memberId = childSnapshot.val();
                    if (memberId !== userId) {
                        members.push(memberId);
                    }
                });
                
                if (members.length === 0) {
                    console.error('No other members found');
                    this.setState({ activeUsers: [] });
                    return;
                }
    
                members.forEach(memberId => {
                    // Get member data
                    const memberRef = db.ref(`users/${memberId}`);
                    memberRef.on('value', (memberSnapshot) => {
                        const userStatus = memberSnapshot.val();
                        
                        // Get member's status in the group
                        const userStatusRef = db.ref(`/groups/${groupId}/userStatus/${memberId}`);
                        userStatusRef.on('value', (userStatusSnapshot) => {
                            const groupStatus = userStatusSnapshot.val();
                            
                            this.setState(prevState => {
                                const activeUsers = [...prevState.activeUsers];
                                const selectedFriends = [...prevState.selectedFriends];
                                
                                // Check if the user is already in the activeUsers list
                                const userIndex = activeUsers.findIndex(user => user.userId === memberId);
                                
                                if (groupStatus?.inChat) {
                                    // User is in chat, add or update the user in the activeUsers list
                                    if (userIndex !== -1) {
                                        activeUsers[userIndex] = {
                                            userId: memberId,
                                            userName: userStatus?.userName,
                                            online: userStatus?.online,
                                            lastOnlineTime: userStatus?.lastOnlineTime,
                                            inChat: groupStatus.inChat,
                                            write: groupStatus?.write || false,
                                            bio: userStatus?.bio
                                        };
                                    } else {
                                        activeUsers.push({
                                            userId: memberId,
                                            userName: userStatus?.userName,
                                            online: userStatus?.online,
                                            lastOnlineTime: userStatus?.lastOnlineTime,
                                            inChat: groupStatus.inChat,
                                            write: groupStatus?.write || false,
                                            bio: userStatus?.bio
                                        });
                                    }
                                } else {
                                    // User is not in chat, remove them from the activeUsers list
                                    if (userIndex !== -1) {
                                        activeUsers.splice(userIndex, 1);
                                    }
                                    
                                    // Also remove user from selectedFriends if they are there
                                    const selectedIndex = selectedFriends.indexOf(memberId);
                                    if (selectedIndex !== -1) {
                                        selectedFriends.splice(selectedIndex, 1);
                                    }
                                }
                                
                                return { activeUsers, selectedFriends };
                            });
                        });
                    });
                });
            });
    
        } catch (error) {
            console.error('Error fetching group members or updating statuses:', error);
            this.setState({ activeUsers: [], selectedFriends: [] });
        }
    };
    
    openModal = async () => {
        this.setState({ showModal: true });

        

    
      /*  const allMembers = Object.keys(this.state.members);
        console.log(allMembers);
        const friends = [];
    
        for (const userId of allMembers) {
            const snapshot = await firebase
                .app()
                .database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/')
                .ref(`users/${userId}`)
                .once('value');
            if (snapshot.exists()) {
                friends.push({ userId, ...snapshot.val() });
            }
        }

    */

    };

    openModall = async (messageId) => {
        this.setState({ showModall: true });
        const { groupId } = this.props.route.params;
        const userId = auth().currentUser.uid;
        const db = firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/');
    
        try {
            // Listen for changes to the list of users who have read the message
            const messageRef = db.ref(`groups/${groupId}/messages/${messageId}`);
            messageRef.on('value', async (messageSnapshot) => {
                const messageData = messageSnapshot.val();
                const readList = messageData?.read || [];
    
                // Get the list of all group members
                const groupMembersRef = db.ref(`groups/${groupId}/members`);
                const groupMembersSnapshot = await groupMembersRef.once('value');
                const groupMembers = [];
                groupMembersSnapshot.forEach(childSnapshot => {
                    const memberId = childSnapshot.val();
                    if (memberId !== userId) {
                        groupMembers.push(memberId);
                    }
                });
    
                // Separate members into readsList and notReadsList
                const readsList = [];
                const notReadsList = [];
    
                for (const memberId of groupMembers) {
                    const memberRef = db.ref(`users/${memberId}`);
                    const memberSnapshot = await memberRef.once('value');
                    const memberData = memberSnapshot.val();
    
                    if (readList.includes(memberId)) {
                        readsList.push({
                            userId: memberId,
                            userName: memberData?.userName,
                            online: memberData?.online,
                            lastOnlineTime: memberData?.lastOnlineTime,
                            bio: memberData?.bio
                        });
                    } else {
                        notReadsList.push({
                            userId: memberId,
                            userName: memberData?.userName,
                            online: memberData?.online,
                            lastOnlineTime: memberData?.lastOnlineTime,
                            bio: memberData?.bio
                        });
                    }
                }
    
                console.log('Okuyanlar Listesi:', readsList);
                console.log('Okumayanlar Listesi:', notReadsList);
    
                const sections = [];
    
                if (readsList.length > 0) {
                    sections.push({
                        title: 'Seen',
                        data: readsList,
                    });
                }
    
                if (notReadsList.length > 0) {
                    sections.push({
                        title: 'Not Seen',
                        data: notReadsList,
                    });
                }
    
                this.setState({ sections });
                console.log("sec" + sections.length);
    
            });
    
        } catch (error) {
            console.error('Error fetching data:', error);
    
        }
    };
    
    handleFriendPress = (item) => {
        const { selectedFriends,activeUsers } = this.state;
        const isSelected = selectedFriends.includes(item.userId);
        const updatedSelectedFriends = isSelected
            ? selectedFriends.filter(id => id !== item.userId)
            : [...selectedFriends, item.userId];
    
            const allSelected = activeUsers.every(user => updatedSelectedFriends.includes(user.userId));

            this.setState({ 
                selectedFriends: updatedSelectedFriends,
                selectAll: allSelected 
            });

    };
    handleSelectAll = () => {
        const { activeUsers, selectAll } = this.state;
        const updatedSelectedFriends = selectAll ? [] : activeUsers.map(user => user.userId);
        
        this.setState({ 
            selectedFriends: updatedSelectedFriends,
            selectAll: !selectAll,
        });
    };
    render() {
        const { text, messages, connectedUserCount, otherUserInChat, showTooltip, showModal, selectedFriends,activeUsers,showModall,sections,selectAll  } = this.state;
        const { roomId, conversationId, groupId } = this.props.route.params;
        const inChatMembersCount = Object.values(this.state.members).filter(member => member.inChat).length;

    
    
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
                        <TextInput
                            value={text}
                            style={style.input}
                            placeholder='Write message..'
                            onChangeText={this.handleTextInputChange}
                            onEndEditing={this.handleTextInputEndEditing}
                        />
                        <TouchableOpacity onPress={()=>this.handleSend()}>
                            <Icon name={"paper-plane"} size={25} color='#FF8400'></Icon>
                        </TouchableOpacity>
                        {(conversationId || groupId) && (
                            <View style={{ position: 'relative' }}>
                                <TouchableOpacity onPress={() => (conversationId) ? !otherUserInChat ? this.showTooltip() : this.handleSend("vibration") : inChatMembersCount > 0 ? this.openModal() : this.showTooltip()}>
                                    <Icon name="wave-square" size={24} color={(conversationId) ? otherUserInChat ? "#FF8400" : "gray" : inChatMembersCount > 0 ? "#FF8400" : "gray"} style={{ padding: 10 }} />
                                </TouchableOpacity>
                                {showTooltip && (
                                    <View style={style.tooltip}>
                                        <Text style={style.tooltipText}>
                                            {conversationId
                                                ? `${this.state.userName} is currently not in chat`
                                                : 'Currently, no one is in chat'}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        )}
                    </View>
                </View>
    
                <Modal
                visible={showModal}
                transparent={true}
                animationType="fade"
            >
                <TouchableWithoutFeedback onPress={() => this.setState({ showModal: false, selectedFriends: [], selectAll: false })}>
                    <View style={style.modalBackground}>
                        <TouchableWithoutFeedback onPress={() => {}}>
                            <View style={style.modalContainer}>
                                <Text style={style.modalTitle}>Users in Chat</Text>
                                <FlatList
                                    data={activeUsers}
                                    keyExtractor={(item) => item.userId}
                                    renderItem={({ item }) => (
                                        <TouchableOpacity
                                            style={[style.item, selectedFriends.includes(item.userId) && style.selectedItem]}
                                            onPress={() => this.handleFriendPress(item)}
                                        >
                                            <Icon name={'crow'} size={30} style={{ paddingRight: 15 }} />
                                            <View>
                                                <Text style={style.title}>{item.userName}</Text>
                                                <Text style={style.name}>{item.bio}</Text>
                                            </View>
                                        </TouchableOpacity>
                                    )}
                                />
                                <View style={style.selectAllContainer}>
                                    <CheckBox 
                                        value={selectAll}
                                        style={{alignItems:'center'}}
                                        tintColors={{ true: '#FF8400', false: '#000' }}
                                        onValueChange={this.handleSelectAll}
                                    />
                                    <TouchableOpacity onPress={this.handleSelectAll}>
                                        <Text style={style.selectAllText}>Select All Users</Text>
                                    </TouchableOpacity>
                                </View>
                                <TouchableOpacity
    style={style.vibrateButton}
    onPress={async () => {
        await this.handleSend("vibration");
        this.setState({ selectedFriends: [], selectAll: false,showModal: false });
    }}
>
                                    <Text style={style.vibrateButtonText}>Vibrate</Text>
                                </TouchableOpacity>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

            <Modal
                visible={showModall}
                transparent={true}
                animationType="fade"
            >
                <TouchableWithoutFeedback onPress={() => this.setState({ showModall: false })}>
                    <View style={style.modalBackground}>
                        <TouchableWithoutFeedback onPress={() => {}}>
                            <View style={style.modalContainer}>
                                <Text style={style.modalTitle}>Message Status</Text>
                                <SectionList
                                    sections={sections}
                                    keyExtractor={(item) => item.userId}
                                    renderItem={({ item, section }) => (
                                        <View style={style.item}>
                                            <Icon name={'crow'} size={30} style={{ paddingRight: 15 }} />
                                            <View>
                                                <Text style={style.title}>{item.userName}</Text>
                                                <Text style={style.name}>{item.bio}</Text>
                                            </View>
                                            <View style={{ flex: 1 }} />
                                            <Icon
                                                name={'check'}
                                                size={11}
                                                style={{ color: section.title === 'Seen' ? '#0f73ae' : 'black', marginLeft: 10 }}
                                            />
                                        </View>
                                    )}
                                    renderSectionHeader={({ section: { title } }) => (
                                        <Text style={{  fontSize: 20,
                                            marginBottom: 10,
                                            textAlign: 'left',  }}>{title}</Text>
                                    )}
                                />
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
            </SafeAreaView>
        );
    }
}

const style = StyleSheet.create({
    selectAllContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
        
    },
    selectAllText: {
        marginLeft: 10,
        fontSize: 16,
    },
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
    modalBackground: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 10,
        width: '80%',
        maxHeight: '50%',
    },
    modalTitle: {
        fontSize: 20,
        marginBottom: 10,
        textAlign: 'center',
        fontWeight:'500',
        color:'black'
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        marginBottom:10,
        borderBottomColor: '#dedede',
        borderBottomWidth: 1,
        width: '100%',
    },
    selectedItem: {
        backgroundColor: 'rgba(255, 132, 0, 0.2)',
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    name: {
        fontSize: 14,
        color: '#666',
    },
    vibrateButton: {
        marginTop: 20,
        alignItems: 'center',
        padding: 10,
        backgroundColor: '#FF8400',
        borderRadius: 5,
    },
    vibrateButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
});

export default Chat;