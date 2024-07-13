import React, { Component } from 'react';
import { View, Text, StyleSheet } from 'react-native';

class Groups extends Component {
    render() {
        return (
            <View style={styles.container}>
                <Text style={styles.text}>Groups Tab</Text>
            </View>
        );
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    text: {
        fontSize: 18,
        color: '#333'
    }
});

export default Groups;
