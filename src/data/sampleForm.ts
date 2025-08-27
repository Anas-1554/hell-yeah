import type { FormConfig } from '../types/form';

export const sampleForm: FormConfig = {
  title: 'Social Giveaway Entry',
  description: 'Complete the form to enter.',
  questions: [
    // 1. Name *
    {
      id: 'name',
      type: 'text',
      title: 'Name',
      placeholder: 'Your full name',
      required: true,
    },
    // 2. Email or Phone Number *
    {
      id: 'contact_info',
      type: 'contact',
      title: 'Email or Phone Number',
      description: 'Choose at least one method and provide your details',
      required: true,
      options: [
        { value: 'email', label: 'Email' },
        { value: 'phone', label: 'Phone' },
      ],
    },
    // 3. Social Media Platform(s) you will be posting on? (multi-select)
    {
      id: 'platform',
      type: 'checkbox',
      title: 'Social Media Platform(s) you will be posting on?',
      description: 'Select all that apply (Instagram, Facebook, TikTok)',
      required: true,
      validation: { min: 1, message: 'Select at least one platform.' },
      options: [
        { value: 'instagram', label: 'Instagram' },
        { value: 'facebook', label: 'Facebook' },
        { value: 'tiktok', label: 'TikTok' },
      ],
    },
    {
      id: 'social_media_id',
      type: 'text',
      title: 'Social Media @',
      description: 'Enter your account url',
      placeholder: '@newamericanfunding',
      required: true,
    },
    // 4. Address for check delivery
    {
      id: 'address',
      type: 'textarea',
      title: 'Mailing Address',
      description: 'We need this address so New American Funding can send check to winner of the contest',
      placeholder: 'Enter your full mailing address including street, city, state, and ZIP code',
      required: true,
    },
    // 5. I agree — must check all three boxes
    {
      id: 'agreements',
      type: 'checkbox',
      title: 'I agree',
      description: 'Please check all three boxes',
      required: true,
      validation: { min: 3, max: 3, message: 'You must agree to all three.' },
      options: [
        { value: 'age_over_18', label: 'I confirm I am over 18 years of age. (required)' },
        { value: 'agree_rules', label: 'I confirm I have read and agree to the official competition rules. (required)', linkTo: '/rules.html', linkLabel: 'official competition rules' },
        { value: 'following_accounts', label: 'I acknowledge that I am following New American Funding’s social media accounts. (required)' },
      ],
    },
  ],
  successMessage: 'Thank you! Your entry has been submitted.',
  brandColor: '#111640',
};