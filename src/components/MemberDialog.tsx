import {useEffect, useState} from 'react';
import {Dialog, DialogHeader} from '@astryxdesign/core/Dialog';
import {VStack, HStack, StackItem} from '@astryxdesign/core/Stack';
import {FormLayout} from '@astryxdesign/core/FormLayout';
import {TextInput} from '@astryxdesign/core/TextInput';
import {Button} from '@astryxdesign/core/Button';
import {AlertDialog} from '@astryxdesign/core/AlertDialog';
import {useStore} from '../lib/store';
import {useT} from '../lib/hooks';
import {uid} from '../lib/format';
import type {Member} from '../lib/types';

/** Add or edit a member. Removal is only allowed before the first draw. */
export function MemberDialog({
  isOpen,
  onOpenChange,
  member,
}: {
  isOpen: boolean;
  onOpenChange: (o: boolean) => void;
  member: Member | null;
}) {
  const t = useT();
  const addMember = useStore(s => s.addMember);
  const updateMember = useStore(s => s.updateMember);
  const removeMember = useStore(s => s.removeMember);
  const canRemove = useStore(s => s.draws.length === 0 && s.members.length > 2);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [confirmRemove, setConfirmRemove] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(member?.name ?? '');
      setPhone(member?.phone ?? '');
    }
  }, [isOpen, member]);

  const save = () => {
    if (!name.trim()) return;
    if (member) updateMember({...member, name: name.trim(), phone: phone.trim()});
    else addMember({id: uid('mbr'), name: name.trim(), phone: phone.trim()});
    onOpenChange(false);
  };

  return (
    <>
      <Dialog isOpen={isOpen} onOpenChange={onOpenChange} width={460} purpose="form">
        <DialogHeader title={member ? t('kh.editMember') : t('kh.addMember')} onOpenChange={onOpenChange} />
        <VStack gap={6} padding={4}>
          <FormLayout>
            <TextInput label={t('name')} value={name} onChange={setName} size="lg" isRequired hasAutoFocus onEnter={save} />
            <TextInput label={t('su.memberPhone')} value={phone} onChange={setPhone} size="lg" isOptional onEnter={save} />
          </FormLayout>
          <HStack gap={2} vAlign="center">
            {member && canRemove && (
              <Button variant="destructive" size="lg" label={t('kh.removeMember')} onClick={() => setConfirmRemove(true)} />
            )}
            <StackItem size="fill">
              <HStack gap={2} hAlign="end">
                <Button label={t('cancel')} size="lg" onClick={() => onOpenChange(false)} />
                <Button variant="primary" size="lg" label={t('save')} isDisabled={!name.trim()} onClick={save} />
              </HStack>
            </StackItem>
          </HStack>
        </VStack>
      </Dialog>
      {member && (
        <AlertDialog
          isOpen={confirmRemove}
          onOpenChange={setConfirmRemove}
          title={t('kh.removeConfirm', {name: member.name})}
          description={t('kh.membersLocked')}
          actionLabel={t('delete')}
          cancelLabel={t('cancel')}
          onAction={() => {
            removeMember(member.id);
            setConfirmRemove(false);
            onOpenChange(false);
          }}
        />
      )}
    </>
  );
}
